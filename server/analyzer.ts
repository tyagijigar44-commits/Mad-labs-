import { db } from './db.ts';

export interface AnalyzerMessageParsed {
  protocol: 'HL7' | 'ASTM';
  sampleBarcode: string;
  instrumentId: string;
  timestamp: string;
  results: {
    analyzerParamCode: string;
    value: string;
    unit: string;
    status: string;
  }[];
}

// Parse HL7 v2 ORU^R01 message
export function parseHL7Message(rawHL7: string): AnalyzerMessageParsed {
  const lines = rawHL7.trim().split(/\r?\n/);
  let sampleBarcode = '';
  let instrumentId = 'UNKNOWN_ANALYZER';
  let timestamp = new Date().toISOString();
  const results: AnalyzerMessageParsed['results'] = [];

  for (const line of lines) {
    const fields = line.split('|');
    const seg = fields[0];

    if (seg === 'MSH') {
      instrumentId = fields[2] || instrumentId;
      timestamp = fields[6] || timestamp;
    } else if (seg === 'OBR') {
      // OBR-2 or OBR-3 contains placer/filler order number or sample ID
      sampleBarcode = fields[2] || fields[3] || sampleBarcode;
    } else if (seg === 'OBX') {
      // OBX-3: Observation Identifier (e.g. HGB^Hemoglobin^LN)
      // OBX-5: Observation Value
      // OBX-6: Units
      // OBX-8: Abnormal Flags
      const identifierField = fields[3] || '';
      const paramCode = identifierField.split('^')[0] || identifierField;
      const val = fields[5] || '';
      const unit = fields[6] || '';
      const abnormalFlag = fields[8] || 'N';

      if (paramCode && val) {
        results.push({
          analyzerParamCode: paramCode,
          value: val,
          unit,
          status: abnormalFlag,
        });
      }
    }
  }

  return {
    protocol: 'HL7',
    sampleBarcode: sampleBarcode.replace(/[^A-Za-z0-9\-]/g, ''),
    instrumentId,
    timestamp,
    results,
  };
}

// Parse ASTM E1381/E1394 message
export function parseASTMMessage(rawASTM: string): AnalyzerMessageParsed {
  const lines = rawASTM.trim().split(/\r?\n/);
  let sampleBarcode = '';
  let instrumentId = 'ASTM_INSTRUMENT';
  const results: AnalyzerMessageParsed['results'] = [];

  for (const line of lines) {
    const fields = line.split('|');
    const recordType = fields[0].replace(/^[0-9]+/, ''); // e.g. 1H, 2P, 3O, 4R

    if (recordType === 'H') {
      instrumentId = fields[4] || instrumentId;
    } else if (recordType === 'O') {
      sampleBarcode = fields[2] || fields[3] || sampleBarcode;
    } else if (recordType === 'R') {
      // R|1|^^^WBC|6.8|x10^3/uL||N||F||||20260215120000
      const testField = fields[2] || '';
      const parts = testField.split('^');
      const paramCode = parts[parts.length - 1] || testField;
      const val = fields[3] || '';
      const unit = fields[4] || '';
      const flag = fields[6] || 'N';

      if (paramCode && val) {
        results.push({
          analyzerParamCode: paramCode,
          value: val,
          unit,
          status: flag,
        });
      }
    }
  }

  return {
    protocol: 'ASTM',
    sampleBarcode: sampleBarcode.replace(/[^A-Za-z0-9\-]/g, ''),
    instrumentId,
    timestamp: new Date().toISOString(),
    results,
  };
}

// Simulate an incoming automated transmission from an analyzer
export function simulateAnalyzerRun(analyzerId: string, sampleBarcode?: string): {
  rawPayload: string;
  parsed: AnalyzerMessageParsed;
  matchedSpecimen: any;
  importedCount: number;
} {
  const analyzer = db.analyzers.find(a => a.id === analyzerId) || db.analyzers[0];
  
  // Find a target specimen in the database
  let targetSpecimen = sampleBarcode ? db.specimens.find(s => s.specimenId === sampleBarcode) : null;
  if (!targetSpecimen) {
    targetSpecimen = db.specimens.find(s => s.status === 'processing' || s.status === 'received' || s.status === 'collected') || db.specimens[0];
  }

  const barcode = targetSpecimen ? targetSpecimen.specimenId : 'SMP-2026-3001';
  let rawPayload = '';
  let parsed: AnalyzerMessageParsed;

  if (analyzer.protocol === 'ASTM') {
    // Generate ASTM standard message for Sysmex
    rawPayload = [
      `1H|\\^&|||${analyzer.name}|||||||P|E1394-97|${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`,
      `2P|1|||||||U||||||`,
      `3O|1|${barcode}||^^^CBC-01|R||||||A||||||||||||||O`,
      `4R|1|^^^HGB|13.6|g/dL||N||F|||${analyzer.name}`,
      `5R|2|^^^WBC|6.8|x10^3/uL||N||F|||${analyzer.name}`,
      `6R|3|^^^PLT|235|x10^3/uL||N||F|||${analyzer.name}`,
      `7R|4|^^^RBC|4.58|x10^6/uL||N||F|||${analyzer.name}`,
      `8R|5|^^^HCT|41.2|%||N||F|||${analyzer.name}`,
      `9L|1|N`,
    ].join('\r\n');

    parsed = parseASTMMessage(rawPayload);
  } else {
    // Generate HL7 v2 standard message for Roche / Beckman
    const dt = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    rawPayload = [
      `MSH|^~\\&|${analyzer.name}|LAB_CENTRAL|LIS|APEX|${dt}||ORU^R01|MSG${Date.now()}|P|2.3.1`,
      `PID|1||PAT-2026-1001||Sterling^Eleanor||19840514|F`,
      `OBR|1||${barcode}|CMP-02^Comprehensive Metabolic Panel|||${dt}`,
      `OBX|1|NM|GLUC^Glucose||94.5|mg/dL|70-99|N|||F`,
      `OBX|2|NM|CREAT^Creatinine||0.92|mg/dL|0.6-1.2|N|||F`,
      `OBX|3|NM|ALT^ALT (SGPT)||28|U/L|7-56|N|||F`,
      `OBX|4|NM|AST^AST (SGOT)||24|U/L|10-40|N|||F`,
    ].join('\r\n');

    parsed = parseHL7Message(rawPayload);
  }

  // Update analyzer lastPing
  analyzer.lastPing = new Date().toISOString();
  analyzer.status = 'connected';

  // If matched to an order in DB, insert or update result entries!
  let importedCount = 0;
  if (targetSpecimen) {
    const order = db.orders.find(o => o.id === targetSpecimen.orderId);
    if (order) {
      for (const res of parsed.results) {
        // Map analyzer code to test parameter
        const mapping = analyzer.testMappings.find(m => m.analyzerCode === res.analyzerParamCode);
        const paramName = mapping ? mapping.testName : res.analyzerParamCode;

        // Check if existing result entry
        let existing = db.results.find(r => r.orderId === order.id && r.parameterName.toLowerCase().includes(paramName.toLowerCase()));
        const numVal = parseFloat(res.value);

        if (existing) {
          existing.value = res.value;
          existing.numericValue = isNaN(numVal) ? undefined : numVal;
          existing.unit = res.unit || existing.unit;
          existing.analyzerId = analyzer.id;
          existing.enteredAt = new Date().toISOString();
          existing.version += 1;
        } else {
          // Find matching test
          const matchedTest = db.tests.find(t => t.parameters.some(p => p.name.toLowerCase().includes(paramName.toLowerCase()))) || db.tests[0];
          const testParam = matchedTest.parameters.find(p => p.name.toLowerCase().includes(paramName.toLowerCase()));

          let flag: 'normal' | 'low' | 'high' | 'critical' = 'normal';
          if (testParam && !isNaN(numVal)) {
            if (testParam.criticalLow !== undefined && numVal <= testParam.criticalLow) flag = 'critical';
            else if (testParam.criticalHigh !== undefined && numVal >= testParam.criticalHigh) flag = 'critical';
            else if (numVal < testParam.low) flag = 'low';
            else if (numVal > testParam.high) flag = 'high';
          }

          db.results.push({
            id: 'RES-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            orderId: order.id,
            testId: matchedTest.id,
            parameterName: testParam ? testParam.name : paramName,
            value: res.value,
            numericValue: isNaN(numVal) ? undefined : numVal,
            unit: res.unit || (testParam ? testParam.unit : ''),
            referenceLow: testParam ? testParam.low : undefined,
            referenceHigh: testParam ? testParam.high : undefined,
            flag,
            enteredById: 'SYSTEM_ANALYZER_' + analyzer.id,
            enteredAt: new Date().toISOString(),
            analyzerId: analyzer.id,
            version: 1,
          });
        }
        importedCount++;
      }

      // Mark specimen status as processing or completed
      targetSpecimen.status = 'processing';
      targetSpecimen.receivedAt = targetSpecimen.receivedAt || new Date().toISOString();
      order.status = 'processing';
      db.persist();
    }
  }

  return {
    rawPayload,
    parsed,
    matchedSpecimen: targetSpecimen,
    importedCount,
  };
}
