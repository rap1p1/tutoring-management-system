import React from 'react';
import { Download, PlusCircle, Settings, Key, HelpCircle, FileText, CheckCircle, XCircle, Check, X, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function TutorsTab(props) {
  const {
    activeTab, setActiveTab, pendingTutors, allTutors, allStudents, requests, classes, 
    tuitions, commissions, supportReqs, accounts, settings,
    currentUser, handleApproveTutor, handleOpenClassModal,
    handleOpenClassDetail, handleEndClass, exportClasses,
    setShowCreateInvoiceModal, setShowCreateCommissionModal,
    exportFinances, handleConfirmTuition, handleConfirmCommission,
    handleApproveSupport, handleApproveLeave, handleToggleLockAcc,
    handleSaveConfig, formatLichHoc, newConfig, setNewConfig,
    defaultTyleHH, setDefaultTyleHH, defaultHocPhis, setDefaultHocPhis, showMsg
  } = props;

  return (
    <>
      <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Gia sư</th>
                    <th>Chuyên ngành</th>
                    <th>CCCD/SĐT</th>
                    <th>Minh chứng</th>
                    <th>Học phí mong muốn</th>
                    <th>Khu vực dạy</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTutors.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center" }}>
                        Không có hồ sơ chờ duyệt
                      </td>
                    </tr>
                  ) : (
                    pendingTutors.map((t) => (
                      <tr key={t.mags}>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            {t.anhdaidien ? (
                              <img
                                src={t.anhdaidien}
                                alt="avatar"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  border: "1px solid var(--color-primary)",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "50%",
                                  backgroundColor: "rgba(255,255,255,0.05)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  color: "#94a3b8",
                                }}
                              >
                                N/A
                              </div>
                            )}
                            <div>
                              <strong>{t.hoten}</strong>
                              <br />
                              <span
                                style={{ fontSize: "12px", color: "#94a3b8" }}
                              >
                                {t.gioitinh} -{" "}
                                {new Date(t.ngaysinh).toLocaleDateString(
                                  "vi-VN",
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {t.trinhdo || t.trinhdohocvan}
                          <br />
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {t.chuyennganh}
                          </span>
                        </td>
                        <td>
                          {t.cccd}
                          <br />
                          {t.sdt}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                              fontSize: "13px",
                            }}
                          >
                            {t.anhcccd ? (
                              <a
                                href={t.anhcccd}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "var(--color-teal)",
                                  textDecoration: "underline",
                                }}
                              >
                                CCCD
                              </a>
                            ) : (
                              <span style={{ color: "#ef4444" }}>
                                Không có CCCD
                              </span>
                            )}
                            {t.anhbangcap && (
                              <a
                                href={t.anhbangcap}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "var(--color-primary)",
                                  textDecoration: "underline",
                                }}
                              >
                                Bằng cấp
                              </a>
                            )}
                            {t.anhthesinhvien && (
                              <a
                                href={t.anhthesinhvien}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "var(--color-info)",
                                  textDecoration: "underline",
                                }}
                              >
                                Thẻ SV
                              </a>
                            )}
                          </div>
                        </td>
                        <td>{parseInt(t.hocphimongmuon).toLocaleString()}đ</td>
                        <td>{t.khuvucday || t.khuvuc}</td>
                        <td>
                          {currentUser && currentUser.vaitro !== "BGD" && (
                            <>
                              <button
                                className="btn btn-xs btn-teal"
                                onClick={() =>
                                  handleApproveTutor(t.mags, "DaDuyet")
                                }
                                style={{ marginRight: "5px" }}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                className="btn btn-xs btn-secondary"
                                onClick={() =>
                                  handleApproveTutor(t.mags, "TuChoi")
                                }
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
    </>
  );
}
