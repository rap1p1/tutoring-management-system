import { test, expect } from '@playwright/test';
import path from 'path';

const rnd = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
const generateRandomCCCD = () => Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');

// Helper: login function with proper waits
async function login(page, username, password) {
  await page.goto('/login');
  await page.waitForTimeout(500);
  // Default tab is 'login' (active), so the form should already be visible
  await page.fill('div.auth-form-panel.active >> input[name="username"]', username);
  await page.fill('div.auth-form-panel.active >> input[name="password"]', password);
  await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
}

// ============================================================
// NHÓM 3: LUỒNG NGHIỆP VỤ CHÍNH (End-to-End)
// ============================================================
test.describe('Nhóm 3: Luồng nghiệp vụ chính (End-to-End)', () => {

  // TC-3.1: Học viên gửi yêu cầu học kèm
  test('TC-3.1: Học viên gửi yêu cầu học kèm', async ({ page }) => {
    await login(page, 'hocvien1', 'admin123');
    await expect(page).toHaveURL(/\/student/, { timeout: 10000 });

    await page.click('button:has-text("Gửi Yêu Cầu Mới")');
    await page.waitForTimeout(500);

    // Chọn thông tin yêu cầu
    await page.locator('select[name="mamh"]').selectOption({ index: 0 });
    await page.locator('select[name="caplop"]').selectOption({ value: 'Cấp 2' });
    await page.locator('select[name="hinhthuc"]').selectOption({ value: 'TrucTiep' });
    await page.locator('select[name="gioitinh"]').selectOption({ value: 'KhongYeuCau' });
    await page.locator('select[name="diachi"]').selectOption({ value: 'Quận 1' });
    await page.locator('textarea[name="ghichu"]').fill('Cần ôn thi cuối kỳ - E2E test');

    // Tick lịch học: chọn 3 checkboxes đầu tiên trong bảng lịch
    const checkboxes = page.locator('.modal-content input[type="checkbox"], .modal input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count >= 3) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();
    }

    await page.locator('.modal-content button[type="submit"]').click();
    await expect(page.getByText('Gửi yêu cầu thành công!')).toBeVisible({ timeout: 10000 });
  });

  // TC-3.2: NVQL duyệt hồ sơ Gia sư
  test('TC-3.2: NVQL duyệt hồ sơ Gia sư', async ({ page }) => {
    await login(page, 'nhanvien', 'admin123');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    await page.click('button.admin-tab:has-text("Duyệt Hồ Sơ Gia Sư")');
    await page.waitForTimeout(1000);

    // Nút Duyệt (✓)
    const approveBtn = page.locator('button.btn-teal').first();
    if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await approveBtn.click();
      // Xác nhận popup SweetAlert2
      const swalConfirm = page.locator('button.swal2-confirm');
      await swalConfirm.click({ timeout: 5000 });
      await expect(page.getByText('Đã cập nhật trạng thái hồ sơ')).toBeVisible({ timeout: 10000 });
    } else {
      console.log('Không có gia sư nào chờ duyệt để test TC-3.2');
    }
  });

  // TC-3.3: NVQL từ chối hồ sơ Gia sư
  test('TC-3.3: NVQL từ chối hồ sơ Gia sư', async ({ page }) => {
    // Bước 1: Đăng ký 1 gia sư mới để từ chối
    await page.goto('/login');
    await page.waitForTimeout(300);
    await page.click('button.auth-tab:has-text("Đăng Ký Gia Sư")');
    await page.waitForTimeout(300);

    const gsUsername = `tgsrj_${rnd}`;
    await page.fill('div.auth-form-panel.active >> input[name="username"]', gsUsername);
    await page.fill('div.auth-form-panel.active >> input[name="password"]', '123456');
    await page.fill('div.auth-form-panel.active >> input[name="hoten"]', 'GS Bị Từ Chối');
    await page.fill('div.auth-form-panel.active >> input[name="ngaysinh"]', '1998-03-15');
    await page.selectOption('div.auth-form-panel.active >> select[name="gioitinh"]', 'Nam');
    await page.fill('div.auth-form-panel.active >> input[name="cccd"]', generateRandomCCCD());
    await page.fill('div.auth-form-panel.active >> input[name="sdt"]', '0987654321');
    await page.fill('div.auth-form-panel.active >> input[name="email"]', `${gsUsername}@gmail.com`);
    await page.selectOption('div.auth-form-panel.active >> select[name="trinhdohocvan"]', 'Đại học');
    await page.selectOption('div.auth-form-panel.active >> select[name="chuyennganh"]', 'Sư phạm Toán');
    await page.fill('div.auth-form-panel.active >> input[name="kinhnghiem"]', '1');
    await page.fill('div.auth-form-panel.active >> input[name="hocphimongmuon"]', '150000');
    await page.check('input[name="khuvuc"][value="Quận 1"]');
    await page.setInputFiles('input[name="anhcccd"]', path.join(__dirname, '../test-data/fixtures/cccd-dummy.jpg'));
    await page.setInputFiles('input[name="anhbangcap"]', path.join(__dirname, '../test-data/fixtures/bangcap-dummy.jpg'));

    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page.getByText('Đăng ký hồ sơ gia sư thành công!')).toBeVisible({ timeout: 15000 });

    // Bước 2: Đăng nhập NVQL và từ chối
    await login(page, 'nhanvien', 'admin123');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
    await page.click('button.admin-tab:has-text("Duyệt Hồ Sơ Gia Sư")');
    await page.waitForTimeout(1000);

    // Nút từ chối (✗) — btn-rose
    const rejectBtn = page.locator('button.btn-rose').first();
    if (await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rejectBtn.click();
      await page.locator('button.swal2-confirm').click({ timeout: 5000 });
      await expect(page.getByText('Đã cập nhật trạng thái hồ sơ')).toBeVisible({ timeout: 10000 });
    }
  });

  // TC-3.4: NVQL ghép lớp (tạo lớp từ yêu cầu)
  test('TC-3.4: NVQL ghép lớp (tạo lớp từ yêu cầu)', async ({ page }) => {
    await login(page, 'nhanvien', 'admin123');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    await page.click('button.admin-tab:has-text("Yêu Cầu Học Kèm")');
    await page.waitForTimeout(1000);

    const createBtn = page.locator('button:has-text("Tạo Lớp & Ghép GS")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(500);

      await page.fill('input[name="mags"]', '1'); // giasu1 từ seed
      await page.fill('input[name="hocphi"]', '200000');

      await page.locator('button:has-text("Xác Nhận Tạo Lớp")').click();
      await expect(page.getByText(/Ghép lớp thành công|Đã ghép lớp thành công/)).toBeVisible({ timeout: 10000 });
    } else {
      console.log('Không có yêu cầu nào để ghép lớp cho TC-3.4');
    }
  });

  // TC-3.5: NVQL ghép lớp — Validation lỗi (bỏ trống mã GS)
  test('TC-3.5: NVQL ghép lớp — Validation lỗi (bỏ trống)', async ({ page }) => {
    await login(page, 'nhanvien', 'admin123');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    await page.click('button.admin-tab:has-text("Yêu Cầu Học Kèm")');
    await page.waitForTimeout(1000);

    const createBtn = page.locator('button:has-text("Tạo Lớp & Ghép GS")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(500);
      await page.fill('input[name="mags"]', ''); // Bỏ trống
      await page.locator('button:has-text("Xác Nhận Tạo Lớp")').click();
      await expect(page.getByText(/Vui lòng chọn gia sư|Vui lòng điền mã gia sư/)).toBeVisible({ timeout: 5000 });
    }
  });

  // TC-3.5 (bổ sung): Mã GS không tồn tại
  test('TC-3.5: NVQL ghép lớp — Mã GS không tồn tại (999)', async ({ page }) => {
    await login(page, 'nhanvien', 'admin123');
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    await page.click('button.admin-tab:has-text("Yêu Cầu Học Kèm")');
    await page.waitForTimeout(1000);

    const createBtn = page.locator('button:has-text("Tạo Lớp & Ghép GS")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(500);
      await page.fill('input[name="mags"]', '999');
      await page.fill('input[name="hocphi"]', '200000');
      await page.locator('button:has-text("Xác Nhận Tạo Lớp")').click();
      await expect(page.getByText(/Mã gia sư không tồn tại|hồ sơ gia sư chưa được duyệt/)).toBeVisible({ timeout: 10000 });
    }
  });
});
