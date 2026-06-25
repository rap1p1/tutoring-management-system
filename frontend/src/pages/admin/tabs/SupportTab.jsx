import React from 'react';
import { Download, PlusCircle, Settings, Key, HelpCircle, FileText, CheckCircle, XCircle, Check, X, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function SupportTab(props) {
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
      <div
              className="dashboard-grid"
              style={{ gridTemplateColumns: "1fr", gap: "20px" }}
            >
              <div>
                <h3 style={{ marginBottom: "15px" }}>Yêu Cầu Đổi/Nghỉ Lớp</h3>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ngày yêu cầu</th>
                        <th>Lớp / Môn</th>
                        <th>Người gửi</th>
                        <th>Lý do</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supportRequests.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center" }}>
                            Không có yêu cầu nào
                          </td>
                        </tr>
                      ) : (
                        supportRequests.map((s) => (
                          <tr key={s.maycdg}>
                            <td>
                              {new Date(s.ngayyeucau).toLocaleString("vi-VN")}
                            </td>
                            <td>
                              Lớp {s.malop}
                              <br />
                              <span
                                style={{ fontSize: "12px", color: "#94a3b8" }}
                              >
                                {s.tenmh}
                              </span>
                            </td>
                            <td>
                              <strong>HV:</strong> {s.tenhocvien}
                              <br />
                              <strong>GS:</strong> {s.tengiasu || "Chưa có"}
                            </td>
                            <td
                              style={{
                                maxWidth: "250px",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {s.lydo && s.lydo.includes('[BẤT KHẢ KHÁNG]') ? (
                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{s.lydo}</span>
                              ) : (
                                s.lydo
                              )}
                            </td>
                            <td>
                              <span
                                className={`status-badge ${s.trangthai === "DaXuLy" ? "status-active" : "status-pending"}`}
                              >
                                {s.trangthai === "DaXuLy"
                                  ? "Đã xử lý"
                                  : "Chờ xử lý"}
                              </span>
                            </td>
                            <td>
                              {s.trangthai === "ChoXuLy" &&
                                currentUser &&
                                currentUser.vaitro !== "BGD" && (
                                  <button
                                    className="btn btn-xs btn-teal"
                                    onClick={() =>
                                      handleResolveSupport(s.maycdg)
                                    }
                                  >
                                    Đánh dấu xử lý
                                  </button>
                                )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: "15px" }}>
                  Lịch Sử Báo Vắng 1 Buổi (Học Viên & Gia Sư)
                </h3>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Người báo vắng</th>
                        <th>Lớp / Môn</th>
                        <th>Ngày nghỉ / Ca</th>
                        <th>Lý do chi tiết</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absences.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center" }}>
                            Không có lịch sử báo vắng
                          </td>
                        </tr>
                      ) : (
                        absences.map((a) => {
                          const isPending =
                            a.trangthai === "HVXinNghi" ||
                            a.trangthai === "GSXinNghi";
                          const isHV =
                            a.trangthai === "HVVangCoPhep" ||
                            a.trangthai === "HVXinNghi";

                          let statusClass = "status-disabled";
                          let statusText = "Đã hủy";
                          if (a.trangthai === "HVVangCoPhep") {
                            statusClass = "status-active";
                            statusText = "HV vắng";
                          } else if (a.trangthai === "GSNghi") {
                            statusClass = "status-active";
                            statusText = "GS nghỉ";
                          } else if (isPending) {
                            statusClass = "status-pending";
                            statusText = "Chờ duyệt";
                          }

                          return (
                            <tr key={a.mabuoi}>
                              <td>
                                {isHV ? (
                                  <>
                                    <span
                                      className="status-badge"
                                      style={{
                                        backgroundColor:
                                          "rgba(239, 68, 68, 0.1)",
                                        color: "#ef4444",
                                      }}
                                    >
                                      Học viên
                                    </span>
                                    <br />
                                    <strong>{a.tenhocvien}</strong>
                                  </>
                                ) : (
                                  <>
                                    <span
                                      className="status-badge"
                                      style={{
                                        backgroundColor:
                                          "rgba(245, 158, 11, 0.1)",
                                        color: "#f59e0b",
                                      }}
                                    >
                                      Gia sư
                                    </span>
                                    <br />
                                    <strong>{a.tengiasu}</strong>
                                  </>
                                )}
                              </td>
                              <td>
                                Lớp {a.malop}
                                <br />
                                <span
                                  style={{ fontSize: "12px", color: "#94a3b8" }}
                                >
                                  {a.tenmh}
                                </span>
                              </td>
                              <td>
                                <strong>
                                  {new Date(a.ngayday).toLocaleDateString(
                                    "vi-VN",
                                  )}
                                </strong>
                                <br />
                                <span
                                  style={{ fontSize: "12px", color: "#94a3b8" }}
                                >
                                  Ca:{" "}
                                  {a.cahoc === "Sang"
                                    ? "Sáng"
                                    : a.cahoc === "Chieu"
                                      ? "Chiều"
                                      : "Tối"}
                                </span>
                              </td>
                              <td
                                style={{
                                  maxWidth: "350px",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {a.noidung && a.noidung.includes('[BẤT KHẢ KHÁNG]') ? (
                                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{a.noidung}</span>
                                ) : (
                                  a.noidung
                                )}
                              </td>
                              <td>
                                <span className={`status-badge ${statusClass}`}>
                                  {statusText}
                                </span>
                              </td>
                              <td>
                                {isPending &&
                                  currentUser &&
                                  currentUser.vaitro !== "BGD" && (
                                    <div
                                      style={{ display: "flex", gap: "5px" }}
                                    >
                                      <button
                                        className="btn btn-xs btn-teal"
                                        onClick={() =>
                                          handleDuyetNghi(a.mabuoi, "approve")
                                        }
                                      >
                                        Duyệt
                                      </button>
                                      <button
                                        className="btn btn-xs btn-rose"
                                        onClick={() =>
                                          handleDuyetNghi(a.mabuoi, "reject")
                                        }
                                      >
                                        Từ chối
                                      </button>
                                    </div>
                                  )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
    </>
  );
}
