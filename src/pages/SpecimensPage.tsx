import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { Specimen } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Barcode,
  CheckCircle2,
  XCircle,
  Truck,
  Building2,
  History,
  Printer,
  X,
  AlertTriangle,
  FlaskConical,
} from 'lucide-react';

export const SpecimensPage: React.FC = () => {
  const { user } = useAuth();
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarcodeModal, setSelectedBarcodeModal] = useState<Specimen | null>(null);
  const [rejectModalSpecimen, setRejectModalSpecimen] = useState<Specimen | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Specimen hemolyzed (In vitro hemolysis detected)');

  const loadSpecimens = async () => {
    setLoading(true);
    try {
      const data = await api.getSpecimens();
      setSpecimens(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpecimens();
  }, []);

  const handleUpdateStatus = async (specimenId: string, status: string, notes?: string, reason?: string) => {
    try {
      await api.updateSpecimenStatus(specimenId, {
        status,
        actorName: user?.name || 'Staff Member',
        actorId: user?.id || 'USR-03',
        notes: notes || `Status updated to ${status}`,
        rejectionReason: reason,
      });
      loadSpecimens();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Sample Collection & Barcode Tracking</h1>
          <p className="text-xs text-slate-500 mt-0.5">Phlebotomy accessioning, chain-of-custody, specimen rejection, and transport tracking</p>
        </div>
      </div>

      {/* Specimens Worklist Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Barcode ID</th>
                <th className="py-3 px-4">Tube & Specimen Type</th>
                <th className="py-3 px-4">Patient Demographics</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Collection Status</th>
                <th className="py-3 px-4">Collector / Bench</th>
                <th className="py-3 px-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {specimens.map((sp) => {
                const isLavender = sp.tubeColor?.includes('Lavender');
                const isGold = sp.tubeColor?.includes('Gold');

                return (
                  <tr key={sp.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Barcode & Print */}
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedBarcodeModal(sp)}
                          className="px-2 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 rounded border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="View / Print Barcode Label"
                        >
                          <Barcode className="w-4 h-4 text-slate-700" />
                          <span>{sp.specimenId}</span>
                        </button>
                      </div>
                    </td>

                    {/* Tube Type */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full shrink-0 border ${
                            isLavender ? 'bg-purple-500 border-purple-600' : isGold ? 'bg-amber-400 border-amber-500' : 'bg-red-500 border-red-600'
                          }`}
                        ></span>
                        <div>
                          <p className="font-bold text-slate-800">{sp.specimenType}</p>
                          <p className="text-[10px] text-slate-400">{sp.tubeColor}</p>
                        </div>
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{sp.patient?.lastName.toUpperCase()}, {sp.patient?.firstName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {sp.patient?.patientId}</p>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {sp.department}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          sp.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sp.status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : sp.status === 'received'
                            ? 'bg-sky-100 text-sky-800'
                            : sp.status === 'collected'
                            ? 'bg-amber-100 text-amber-800'
                            : sp.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sp.status.replace('_', ' ')}
                      </span>
                      {sp.rejectionReason && (
                        <p className="text-[10px] text-rose-600 mt-0.5 italic">{sp.rejectionReason}</p>
                      )}
                    </td>

                    {/* Collector */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <p className="font-medium">{sp.collectedBy || 'Pending Draw'}</p>
                      {sp.collectedAt && <p className="text-[10px] text-slate-400">{new Date(sp.collectedAt).toLocaleTimeString()}</p>}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {(sp.status === 'collection_pending' || sp.status === 'ordered') && (
                        <button
                          onClick={() => handleUpdateStatus(sp.id, 'collected', 'Phlebotomy completed without complications.')}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          Collect
                        </button>
                      )}

                      {sp.status === 'collected' && (
                        <button
                          onClick={() => handleUpdateStatus(sp.id, 'received', 'Received at Central Testing Bench.')}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          Receive Lab
                        </button>
                      )}

                      {(sp.status === 'received' || sp.status === 'collected') && (
                        <button
                          onClick={() => setRejectModalSpecimen(sp)}
                          className="px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      )}

                      {sp.status === 'received' && (
                        <button
                          onClick={() => handleUpdateStatus(sp.id, 'processing', 'Loaded onto automated analyzer batch.')}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          Analyze
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Label Modal / Print Preview */}
      {selectedBarcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-sm">Thermal Barcode Label</h3>
              </div>
              <button onClick={() => setSelectedBarcodeModal(null)} className="p-1 rounded-lg hover:bg-slate-800 text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Realistic Clinical Specimen Tube Label */}
            <div className="p-6 flex flex-col items-center">
              <div className="w-64 p-3.5 rounded-lg border-2 border-dashed border-slate-400 bg-white shadow-xs font-mono text-[10px] space-y-1.5 text-slate-900">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1 font-bold">
                  <span>APEX LIS LAB</span>
                  <span>{selectedBarcodeModal.department.toUpperCase()}</span>
                </div>
                <div className="font-bold text-xs truncate">
                  {selectedBarcodeModal.patient?.lastName.toUpperCase()}, {selectedBarcodeModal.patient?.firstName}
                </div>
                <div className="text-[10px] text-slate-600">
                  ID: {selectedBarcodeModal.patient?.patientId} | {selectedBarcodeModal.patient?.gender.toUpperCase()}, {selectedBarcodeModal.patient?.age}Y
                </div>

                {/* Simulated Barcode Stripes */}
                <div className="py-2 flex flex-col items-center">
                  <div className="h-10 w-full flex items-center justify-between px-2 bg-slate-900 rounded-xs">
                    <div className="h-full w-1 bg-white"></div>
                    <div className="h-full w-2 bg-white"></div>
                    <div className="h-full w-0.5 bg-white"></div>
                    <div className="h-full w-3 bg-white"></div>
                    <div className="h-full w-1 bg-white"></div>
                    <div className="h-full w-2 bg-white"></div>
                    <div className="h-full w-1.5 bg-white"></div>
                    <div className="h-full w-1 bg-white"></div>
                  </div>
                  <span className="font-extrabold tracking-widest text-xs mt-1 text-slate-800">
                    *{selectedBarcodeModal.specimenId}*
                  </span>
                </div>

                <div className="flex justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>{selectedBarcodeModal.specimenType}</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Chain of Custody History */}
              <div className="w-full mt-4 text-xs space-y-2">
                <p className="font-bold text-slate-700 flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-teal-600" />
                  <span>Chain of Custody Events:</span>
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                  {selectedBarcodeModal.events?.map((ev, i) => (
                    <div key={i} className="border-b border-slate-200/60 pb-1 last:border-0">
                      <span className="font-bold text-teal-800">{ev.status}</span> by {ev.actorName}
                      <p className="text-[10px] text-slate-500">{new Date(ev.timestamp).toLocaleString()} - {ev.notes}</p>
                    </div>
                  ))}
                  {(!selectedBarcodeModal.events || selectedBarcodeModal.events.length === 0) && (
                    <p className="text-slate-400 italic">No events logged yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedBarcodeModal(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Label</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Specimen Modal */}
      {rejectModalSpecimen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-rose-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-200" />
                <h3 className="font-bold text-sm">Specimen Rejection & Recollection</h3>
              </div>
              <button onClick={() => setRejectModalSpecimen(null)} className="p-1 rounded-lg hover:bg-rose-800 text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                You are rejecting specimen <strong className="font-mono text-slate-900">{rejectModalSpecimen.specimenId}</strong> for patient {rejectModalSpecimen.patient?.firstName} {rejectModalSpecimen.patient?.lastName}.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard Rejection Reason (CAP/CLIA Compliant)</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="Specimen hemolyzed (In vitro hemolysis detected)">Specimen Hemolyzed</option>
                  <option value="Specimen clotted (Inappropriate anticoagulation)">Specimen Clotted</option>
                  <option value="Insufficient sample volume (QNS)">Insufficient Sample Volume (QNS)</option>
                  <option value="Lipemic / Turbid specimen interfering with optical read">Lipemic Specimen</option>
                  <option value="Incorrect tube type / additive mismatch">Incorrect Tube / Container</option>
                  <option value="Specimen container leaked during transport">Container Compromised / Leaked</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                Rejecting will notify phlebotomy to initiate an urgent recollection order for this patient.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectModalSpecimen(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleUpdateStatus(rejectModalSpecimen.id, 'rejected', 'Specimen rejected at bench.', rejectionReason);
                    setRejectModalSpecimen(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
