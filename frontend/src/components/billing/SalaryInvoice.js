export const printSalaryInvoice = (t) => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Phiếu Chi Lương Gia Sư #${t.mahh || 'New'}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          .invoice-box { max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.15); }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .details { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .details th, .details td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
          .total { font-size: 18px; font-weight: bold; text-align: right; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <h2 style="margin:0; color:#14b8a6;">GiaSưConnect</h2>
              <p style="margin:5px 0 0;">Trung tâm gia sư uy tín</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin:0; color:#555;">PHIẾU CHI LƯƠNG GIA SƯ</h3>
              <p style="margin:5px 0 0;">Kỳ lương: ${t.thangnam}</p>
              <p style="margin:5px 0 0;">Ngày chi: ${new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
          <table class="details">
            <tr><th>Gia sư:</th><td>${t.tengiasu || 'Gia sư'}</td></tr>
            <tr><th>Lớp phụ trách:</th><td>Lớp ${t.malop} - ${t.tenmh || ''}</td></tr>
            <tr><th>Tổng doanh thu lớp:</th><td>${new Intl.NumberFormat('vi-VN').format(t.tongtienday)} VNĐ</td></tr>
            <tr><th>Khấu trừ hoa hồng (${t.tylehoahong}%):</th><td>- ${new Intl.NumberFormat('vi-VN').format(t.tienhoahong)} VNĐ</td></tr>
          </table>
          <div class="total" style="color: #14b8a6; padding-top: 15px; border-top: 2px dashed #eee;">
            Thực Lĩnh: ${new Intl.NumberFormat('vi-VN').format(t.tientragiasu)} VNĐ
          </div>
          <div class="footer">
            <div>
              <p><strong>Người lập phiếu</strong></p>
              <p style="margin-top:40px;">(Ký & ghi rõ họ tên)</p>
            </div>
            <div>
              <p><strong>Gia sư nhận tiền</strong></p>
              <p style="margin-top:40px;">(Ký & ghi rõ họ tên)</p>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
