import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { Patient } from '../types.ts';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  Calendar,
  FileSpreadsheet,
  FileCheck2,
  Receipt,
  X,
  AlertCircle,
  Plus,
  CheckCircle2,
} from 'lucide-react';

export const PatientsPage: React.FC<{ onNavigateToOrderWithPatient?: (patientId: string) => void }> = ({
  onNavigateToOrderWithPatient,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '1990-01-01',
    gender: 'female',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: 'Spouse',
    notes: '',
  });
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  const loadPatients = async (q?: string) => {
    setLoading(true);
    try {
      const data = await api.getPatients(q);
      setPatients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(searchQuery);
  }, [searchQuery]);

  const handleOpenPatientDetail = async (patient: Patient) => {
    try {
      const detailed = await api.getPatient(patient.id);
      setSelectedPatient(detailed);
    } catch {
      setSelectedPatient({ patient, orders: [], reports: [], invoices: [] });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(false);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        emergencyContact: {
          name: formData.emergencyName,
          phone: formData.emergencyPhone,
          relation: formData.emergencyRelation,
        },
        notes: formData.notes,
      };

      await api.createPatient(payload);
      setRegSuccess(true);
      setTimeout(() => {
        setIsRegisterOpen(false);
        setRegSuccess(false);
        loadPatients();
      }, 1000);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Patient Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Search demographics, medical history, historical reports and billing</p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Patient Name, ID (PAT-2026-xxxx), Phone or Email..."
          className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400 font-medium"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            Clear
          </button>
        )}
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Demographics</th>
                <th className="py-3 px-4">Contact Information</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Consent Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-800">{p.patientId}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{p.lastName.toUpperCase()}, {p.firstName}</p>
                    <p className="text-[10px] text-slate-400">{p.address}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 capitalize">
                    {p.gender}, {p.age} Yrs ({p.dob})
                  </td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{p.phone}</span>
                    </div>
                    {p.email && (
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{p.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-extrabold px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[11px]">
                      {p.bloodGroup || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenPatientDetail(p)}
                      className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm">
                  {selectedPatient.patient.firstName[0]}{selectedPatient.patient.lastName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {selectedPatient.patient.lastName.toUpperCase()}, {selectedPatient.patient.firstName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {selectedPatient.patient.patientId} | {selectedPatient.patient.gender.toUpperCase()}, {selectedPatient.patient.age} Yrs | Blood: {selectedPatient.patient.bloodGroup || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Demographics Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Phone</span>
                  <span className="font-semibold text-slate-800">{selectedPatient.patient.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Email</span>
                  <span className="font-semibold text-slate-800">{selectedPatient.patient.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Emergency Contact</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPatient.patient.emergencyContact?.name} ({selectedPatient.patient.emergencyContact?.phone})
                  </span>
                </div>
              </div>

              {/* Order History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                    <span>Laboratory Orders ({selectedPatient.orders?.length || 0})</span>
                  </h4>
                </div>
                <div className="space-y-2">
                  {selectedPatient.orders?.map((ord: any) => (
                    <div key={ord.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                        <span className="text-slate-400 ml-2">Date: {new Date(ord.createdAt).toLocaleDateString()}</span>
                        <span className="text-[10px] font-bold ml-2 px-2 py-0.5 rounded-full bg-slate-100 capitalize">
                          {ord.status}
                        </span>
                      </div>
                      <span className="font-bold text-slate-700">${ord.totalAmount.toFixed(2)}</span>
                    </div>
                  ))}
                  {(!selectedPatient.orders || selectedPatient.orders.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No previous test orders found for this patient.</p>
                  )}
                </div>
              </div>

              {/* Released Reports */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    <span>Authorized Diagnostic Reports ({selectedPatient.reports?.length || 0})</span>
                  </h4>
                </div>
                <div className="space-y-2">
                  {selectedPatient.reports?.map((rep: any) => (
                    <div key={rep.id} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-emerald-900">{rep.reportNumber}</span>
                        <span className="text-emerald-700 ml-2">Released: {new Date(rep.releasedAt).toLocaleDateString()}</span>
                        <span className="text-slate-500 ml-2 text-[11px]">Signatory: {rep.verifiedByName}</span>
                      </div>
                      <a
                        href={`/api/reports/${rep.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 transition-colors"
                      >
                        Download PDF
                      </a>
                    </div>
                  ))}
                  {(!selectedPatient.reports || selectedPatient.reports.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No authorized diagnostic reports released yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="bg-teal-700 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-200" />
                <h3 className="font-bold text-base">New Patient Registration</h3>
              </div>
              <button onClick={() => setIsRegisterOpen(false)} className="p-1 rounded-lg hover:bg-teal-800 text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {regError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}
              {regSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Patient successfully registered!</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    placeholder="+1 555-0100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    placeholder="patient@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="Street, City, Postal Code"
                />
              </div>

              <div className="border-t border-slate-200 pt-3">
                <label className="block font-bold text-slate-700 mb-1">Emergency Contact</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={formData.emergencyName}
                    onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Relation (e.g. Spouse)"
                    value={formData.emergencyRelation}
                    onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="consent" defaultChecked required className="rounded text-teal-600 focus:ring-teal-500" />
                <label htmlFor="consent" className="text-slate-600 text-[11px]">
                  Patient has signed diagnostic consent and privacy authorization notice.
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
