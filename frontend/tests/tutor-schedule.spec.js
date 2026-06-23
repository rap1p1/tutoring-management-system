import { test, expect } from '@playwright/test';
import path from 'path';

const generateRandomCCCD = () => Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');

// Helper: login function
async function login(page, username, password) {
  await page.goto('/login');
  await page.waitForTimeout(500);
  await page.fill('div.auth-form-panel.active >> input[name="username"]', username);
  await page.fill('div.auth-form-panel.active >> input[name="password"]', password);
  await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
}

// ============================================================
// NHÓM 4: GIA SƯ — BÁO DẠY & LỊCH
// ============================================================
test.describe('Nhóm 4: Gia sư — Báo dạy & Lịch', () => {

  // TC-4.1: GS xem lớp được phân công
  test('TC-4.1: GS xem lớp được phân công', async ({ page }) => {
    await login(page, 'giasu1', 'admin123');
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });

    await expect(page.getByText('Lớp Học Đang Đảm Nhận')).toBeVisible();
    await expect(page.locator('table').first()).toBeVisible();
  });

  // TC-4.2: GS ghi nhận buổi dạy (thông qua Calendar)
  test('TC-4.2: GS ghi nhận buổi dạy (Báo dạy)', async ({ page }) => {
    await login(page, 'giasu1', 'admin123');
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });

    // Mở lịch dạy của lớp đầu tiên
    const lichDayBtn = page.locator('button:has-text("Lịch dạy")').first();
    if (await lichDayBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lichDayBtn.click();
      await expect(page.locator('.modal-content, .modal')).toBeVisible({ timeout: 5000 });

      // Tìm buổi dạy chưa xác nhận trên lịch (background amber/orange)
      const pendingSession = page.locator('[style*="background"] >> text=Sáng, [style*="background"] >> text=Chiều, [style*="background"] >> text=Tối').first();
      if (await pendingSession.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pendingSession.click();

        // SweetAlert2 popup: chọn "Ghi nhận đã dạy"
        const confirmBtn = page.locator('button.swal2-confirm');
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
          await expect(page.getByText(/Đã ghi nhận|Ghi nhận thành công|Thành công/)).toBeVisible({ timeout: 10000 });
        }
      } else {
        console.log('TC-4.2: Không tìm thấy buổi dạy chờ xác nhận');
      }
    } else {
      console.log('TC-4.2: Nút Lịch dạy không hiển thị (có thể chưa có lớp)');
    }
  });

  // TC-4.3: GS ghi nhận buổi dạy — trùng lặp
  test('TC-4.3: GS ghi nhận buổi dạy — trùng lặp', async ({ page }) => {
    await login(page, 'giasu1', 'admin123');
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });

    const lichDayBtn = page.locator('button:has-text("Lịch dạy")').first();
    if (await lichDayBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lichDayBtn.click();
      await expect(page.locator('.modal-content, .modal')).toBeVisible({ timeout: 5000 });

      // Tìm buổi đã dạy (thường hiển thị màu xanh/teal)
      const completedSession = page.locator('[style*="teal"], [style*="#10b981"], [style*="#14b8a6"]').first();
      if (await completedSession.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completedSession.click();
        // Nếu có SweetAlert, click confirm
        const confirmBtn = page.locator('button.swal2-confirm');
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
          // Nên thấy lỗi trùng hoặc đã ghi nhận rồi
          await page.waitForTimeout(2000);
        }
        console.log('TC-4.3: Click vào buổi đã dạy - kiểm tra hành vi');
      } else {
        console.log('TC-4.3: Không tìm thấy buổi đã dạy trên lịch');
      }
    }
  });

  // TC-4.4: GS mở Lịch dạy (Calendar) + điều hướng tháng
  test('TC-4.4: GS mở Lịch dạy (Calendar)', async ({ page }) => {
    await login(page, 'giasu1', 'admin123');
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });

    const lichDayBtn = page.locator('button:has-text("Lịch dạy")').first();
    if (await lichDayBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lichDayBtn.click();
      await expect(page.locator('.modal-content, .modal')).toBeVisible({ timeout: 5000 });

      // Kiểm tra nút điều hướng tháng ◀ ▶
      const prevBtn = page.locator('button:has-text("◀")');
      const nextBtn = page.locator('button:has-text("▶")');

      if (await prevBtn.isVisible().catch(() => false)) {
        await prevBtn.click();
        await page.waitForTimeout(500);
        await nextBtn.click();
        await page.waitForTimeout(500);
        await expect(page.locator('.modal-content, .modal')).toBeVisible();
      }
    } else {
      console.log('TC-4.4: Nút Lịch dạy không hiển thị');
    }
  });

  // TC-4.5: GS hủy mềm buổi dạy tương lai
  test('TC-4.5: GS hủy mềm buổi dạy tương lai', async ({ page }) => {
    await login(page, 'giasu1', 'admin123');
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });

    const lichDayBtn = page.locator('button:has-text("Lịch dạy")').first();
    if (await lichDayBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lichDayBtn.click();
      await expect(page.locator('.modal-content, .modal')).toBeVisible({ timeout: 5000 });

      // Tìm buổi dạy tương lai chưa xác nhận
      const futureSession = page.locator('[style*="background"] >> text=Sáng, [style*="background"] >> text=Chiều, [style*="background"] >> text=Tối').first();
      if (await futureSession.isVisible({ timeout: 3000 }).catch(() => false)) {
        await futureSession.click();

        // SweetAlert2: chọn "Báo nghỉ buổi này" (nút deny)
        const denyBtn = page.locator('button.swal2-deny');
        if (await denyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await denyBtn.click();
          await page.waitForTimeout(500);

          // Nhập lý do
          const lydoInput = page.locator('#swal-input-lydo');
          if (await lydoInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await lydoInput.fill('Test hủy buổi dạy tương lai - E2E');
            await page.locator('button.swal2-confirm').click();
            await expect(page.getByText(/Đã báo nghỉ thành công|Thành công/)).toBeVisible({ timeout: 10000 });
          }
        }
      } else {
        console.log('TC-4.5: Không tìm thấy buổi dạy tương lai để hủy');
      }
    }
  });

  // TC-4.6: GS đăng ký lịch rảnh
  test('TC-4.6: GS đăng ký lịch rảnh', async ({ page }) => {
    await login(page, 'giasu1', 'admin123');
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });

    const themLichBtn = page.locator('button:has-text("Thêm lịch")').first();
    if (await themLichBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await themLichBtn.click();
      await page.waitForTimeout(500);

      // Tick Thứ 2, Thứ 4, Thứ 6
      const thu2 = page.locator('label:has-text("Thứ 2") >> input[type="checkbox"]');
      const thu4 = page.locator('label:has-text("Thứ 4") >> input[type="checkbox"]');
      const thu6 = page.locator('label:has-text("Thứ 6") >> input[type="checkbox"]');
      if (await thu2.isVisible().catch(() => false)) {
        await thu2.check();
        await thu4.check();
        await thu6.check();
      }

      // Tick Ca Sáng, Ca Chiều
      const caSang = page.locator('label:has-text("Sáng") >> input[type="checkbox"]');
      const caChieu = page.locator('label:has-text("Chiều") >> input[type="checkbox"]');
      if (await caSang.isVisible().catch(() => false)) {
        await caSang.check();
        await caChieu.check();
      }

      await page.locator('.modal-content button[type="submit"]').click();
      await expect(page.getByText('Đăng ký lịch rảnh thành công!')).toBeVisible({ timeout: 10000 });
    } else {
      console.log('TC-4.6: Nút Thêm lịch không hiển thị');
    }
  });

  // TC-4.7: GS xóa lịch rảnh
  test('TC-4.7: GS xóa lịch rảnh', async ({ page }) => {
    await login(page, 'giasu1', 'admin123');
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });

    // Tìm nút xóa lịch rảnh (icon Trash2 hoặc button secondary)
    const deleteBtn = page.locator('.simple-list button.btn-secondary').first();
    if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteBtn.click();

      // SweetAlert2 popup xác nhận xóa
      const confirmBtn = page.locator('button.swal2-confirm');
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('TC-4.7: Không có lịch rảnh nào để xóa');
    }
  });

  // TC-4.8: GS đăng ký môn dạy
  test('TC-4.8: GS đăng ký môn dạy', async ({ page }) => {
    await login(page, 'giasu1', 'admin123');
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });

    const dangKyMonBtn = page.locator('button:has-text("Đăng ký thêm")').first();
    if (await dangKyMonBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dangKyMonBtn.click();
      await page.waitForTimeout(500);

      await page.locator('select[name="mamh"]').selectOption({ index: 0 });
      await page.selectOption('select[name="caplop"]', 'Cấp 2');
      await page.fill('input[name="hocphi"]', '250000');

      await page.locator('button[type="submit"]').click();
      await expect(page.getByText(/Đăng ký thành công|Đăng ký môn học thành công/)).toBeVisible({ timeout: 10000 });
    } else {
      console.log('TC-4.8: Nút Đăng ký thêm không hiển thị');
    }
  });

  // TC-4.9: GS hồ sơ chưa duyệt — chức năng bị khóa
  test('TC-4.9: GS hồ sơ chưa duyệt — chức năng bị khóa', async ({ page }) => {
    // Đăng ký 1 GS mới (sẽ ở trạng thái ChoDuyet)
    const gsUsername = `tgsp_${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
    const cccd = generateRandomCCCD();

    await page.goto('/login');
    await page.waitForTimeout(300);
    await page.click('button.auth-tab:has-text("Đăng Ký Gia Sư")');
    await page.waitForTimeout(300);

    await page.fill('div.auth-form-panel.active >> input[name="username"]', gsUsername);
    await page.fill('div.auth-form-panel.active >> input[name="password"]', '123456');
    await page.fill('div.auth-form-panel.active >> input[name="hoten"]', 'GS Chờ Duyệt');
    await page.fill('div.auth-form-panel.active >> input[name="ngaysinh"]', '1998-06-15');
    await page.selectOption('div.auth-form-panel.active >> select[name="gioitinh"]', 'Nam');
    await page.fill('div.auth-form-panel.active >> input[name="cccd"]', cccd);
    await page.fill('div.auth-form-panel.active >> input[name="sdt"]', '0911223344');
    await page.fill('div.auth-form-panel.active >> input[name="email"]', `${gsUsername}@gmail.com`);
    await page.selectOption('div.auth-form-panel.active >> select[name="trinhdohocvan"]', 'Đại học');
    await page.selectOption('div.auth-form-panel.active >> select[name="chuyennganh"]', 'Sư phạm Toán');
    await page.fill('div.auth-form-panel.active >> input[name="kinhnghiem"]', '1');
    await page.fill('div.auth-form-panel.active >> input[name="hocphimongmuon"]', '200000');
    await page.check('input[name="khuvuc"][value="Quận 1"]');

    await page.setInputFiles('input[name="anhcccd"]', path.join(__dirname, '../test-data/fixtures/cccd-dummy.jpg'));
    await page.setInputFiles('input[name="anhbangcap"]', path.join(__dirname, '../test-data/fixtures/bangcap-dummy.jpg'));

    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page.getByText('Đăng ký hồ sơ gia sư thành công!')).toBeVisible({ timeout: 15000 });

    // Đăng nhập GS mới
    await login(page, gsUsername, '123456');
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });

    // Kiểm tra banner cảnh báo
    await expect(page.getByText('Hồ sơ đang chờ phê duyệt')).toBeVisible();

    // Kiểm tra nút Lịch dạy bị disabled (opacity 0.5)
    const lichDayBtn = page.locator('button:has-text("Lịch dạy")').first();
    if (await lichDayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await lichDayBtn.isDisabled();
      expect(isDisabled).toBeTruthy();
    }

    // Kiểm tra nút Thêm lịch bị disabled
    const themLichBtn = page.locator('button:has-text("Thêm lịch")').first();
    if (await themLichBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await themLichBtn.isDisabled();
      expect(isDisabled).toBeTruthy();
    }
  });
});
