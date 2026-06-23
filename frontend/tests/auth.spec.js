import { test, expect } from '@playwright/test';
import path from 'path';

// Helper
const generateRandomCCCD = () => Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
// Username max 15 chars (DB constraint VARCHAR(15))
const rnd = Math.floor(Math.random() * 999999).toString().padStart(6, '0');

// ============================================================
// NHÓM 1: ĐĂNG KÝ TÀI KHOẢN
// ============================================================
test.describe('Nhóm 1: Đăng ký tài khoản', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('TC-1.1: Đăng ký Học viên — Happy Path', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Đăng Ký Học Viên")');
    await page.waitForTimeout(300);
    const username = `thv_${rnd}`;

    await page.fill('div.auth-form-panel.active >> input[name="username"]', username);
    await page.fill('div.auth-form-panel.active >> input[name="password"]', '123456');
    await page.fill('div.auth-form-panel.active >> input[name="hoten"]', 'Nguyễn Văn A Test');
    await page.fill('div.auth-form-panel.active >> input[name="ngaysinh"]', '2005-03-15');
    await page.fill('div.auth-form-panel.active >> input[name="sdt"]', '0901234567');
    await page.fill('div.auth-form-panel.active >> input[name="email"]', `${username}@gmail.com`);

    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();

    // Success message có thể chứa thêm "Vui lòng đăng nhập"
    await expect(page.getByText(/Đăng ký học viên thành công/)).toBeVisible({ timeout: 10000 });
  });

  test('TC-1.2: Đăng ký Học viên — Validation lỗi', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Đăng Ký Học Viên")');
    await page.waitForTimeout(300);

    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'test_e2e_hv_fail');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', '123'); // Mật khẩu ngắn
    await page.fill('div.auth-form-panel.active >> input[name="hoten"]', 'Test Fail');
    await page.fill('div.auth-form-panel.active >> input[name="ngaysinh"]', '2030-01-01'); // Ngày sinh tương lai
    await page.fill('div.auth-form-panel.active >> input[name="sdt"]', '09012'); // SĐT sai format
    await page.fill('div.auth-form-panel.active >> input[name="email"]', 'test@yahoo.com'); // Email sai đuôi

    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();

    await expect(page.getByText('Mật khẩu phải từ 6 ký tự trở lên')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ngày sinh phải nhỏ hơn ngày hiện tại')).toBeVisible();
    await expect(page.getByText('Số điện thoại phải gồm 10-11 chữ số')).toBeVisible();
    await expect(page.getByText('Email phải đúng định dạng @gmail.com')).toBeVisible();
  });

  test('TC-1.3: Đăng ký Gia sư — Happy Path', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Đăng Ký Gia Sư")');
    await page.waitForTimeout(300);
    const username = `tgs_${rnd}`;
    const cccd = generateRandomCCCD();

    await page.fill('div.auth-form-panel.active >> input[name="username"]', username);
    await page.fill('div.auth-form-panel.active >> input[name="password"]', '123456');
    await page.fill('div.auth-form-panel.active >> input[name="hoten"]', 'Trần Thị B Test');
    await page.fill('div.auth-form-panel.active >> input[name="ngaysinh"]', '2000-05-20');
    await page.selectOption('div.auth-form-panel.active >> select[name="gioitinh"]', 'Nu');
    await page.fill('div.auth-form-panel.active >> input[name="cccd"]', cccd);
    await page.fill('div.auth-form-panel.active >> input[name="sdt"]', '0912345678');
    await page.fill('div.auth-form-panel.active >> input[name="email"]', `${username}@gmail.com`);

    await page.selectOption('div.auth-form-panel.active >> select[name="trinhdohocvan"]', 'Đại học');
    await page.selectOption('div.auth-form-panel.active >> select[name="chuyennganh"]', 'Sư phạm Toán');
    await page.fill('div.auth-form-panel.active >> input[name="kinhnghiem"]', '2');
    await page.fill('div.auth-form-panel.active >> input[name="hocphimongmuon"]', '200000');

    // Tick khu vực
    await page.check('input[name="khuvuc"][value="Quận 1"]');
    await page.check('input[name="khuvuc"][value="Quận 3"]');

    // Upload files (valid JPEG)
    await page.setInputFiles('input[name="anhcccd"]', path.join(__dirname, '../test-data/fixtures/cccd-dummy.jpg'));
    await page.setInputFiles('input[name="anhbangcap"]', path.join(__dirname, '../test-data/fixtures/bangcap-dummy.jpg'));

    // Button là "Gửi Hồ Sơ" cho form GS
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page.getByText('Đăng ký hồ sơ gia sư thành công!')).toBeVisible({ timeout: 15000 });
  });

  test('TC-1.4: Đăng ký Gia sư — Validation lỗi', async ({ page }) => {
    await page.click('button.auth-tab:has-text("Đăng Ký Gia Sư")');
    await page.waitForTimeout(300);

    // Cần fill tất cả required fields để browser không chặn, chỉ để sai giá trị
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'test_gs_fail_val');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', '123'); // Password ngắn
    await page.fill('div.auth-form-panel.active >> input[name="hoten"]', 'Fail Test');
    await page.fill('div.auth-form-panel.active >> input[name="ngaysinh"]', '2015-01-01'); // Chưa đủ 18
    await page.fill('div.auth-form-panel.active >> input[name="cccd"]', '12345'); // CCCD sai
    await page.fill('div.auth-form-panel.active >> input[name="sdt"]', '0912345678');
    await page.fill('div.auth-form-panel.active >> input[name="email"]', 'fail@gmail.com');
    await page.fill('div.auth-form-panel.active >> input[name="kinhnghiem"]', '1');
    await page.fill('div.auth-form-panel.active >> input[name="hocphimongmuon"]', '200000');

    // Upload CCCD nhưng không upload bằng cấp/thẻ SV → check file validation
    // Nhưng nếu browser required chặn, ta cần upload CCCD để bypass HTML required
    // => Không upload gì cả, dùng JS để remove required attribute
    await page.evaluate(() => {
      document.querySelectorAll('input[type="file"][required]').forEach(el => el.removeAttribute('required'));
    });

    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();

    await expect(page.getByText('Mật khẩu phải từ 6 ký tự trở lên')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Gia sư phải đủ 18 tuổi')).toBeVisible();
    await expect(page.getByText('Số CCCD phải gồm 12 chữ số')).toBeVisible();
    await expect(page.getByText('Ảnh CCCD là bắt buộc')).toBeVisible();
    await expect(page.locator('text=Vui lòng tải lên ít nhất Ảnh bằng cấp hoặc Ảnh thẻ sinh viên').first()).toBeVisible();
  });
});

// ============================================================
// NHÓM 2: ĐĂNG NHẬP & PHÂN QUYỀN
// ============================================================
test.describe('Nhóm 2: Đăng nhập & Phân quyền', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(300);
  });

  test('TC-2.1: Đăng nhập đúng - admin → /admin', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'admin');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', 'admin123');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test('TC-2.1: Đăng nhập đúng - giamdoc → /admin', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'giamdoc');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', 'admin123');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test('TC-2.1: Đăng nhập đúng - nhanvien → /admin', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'nhanvien');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', 'admin123');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test('TC-2.1: Đăng nhập đúng - hocvien1 → /student', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'hocvien1');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', 'admin123');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page).toHaveURL(/\/student/, { timeout: 10000 });
  });

  test('TC-2.1: Đăng nhập đúng - giasu1 → /tutor', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'giasu1');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', 'admin123');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page).toHaveURL(/\/tutor/, { timeout: 10000 });
  });

  test('TC-2.2: Đăng nhập sai mật khẩu', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'admin');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', 'wrongpass');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page.getByText('Sai tên đăng nhập hoặc mật khẩu')).toBeVisible({ timeout: 5000 });
  });

  test('TC-2.2: Đăng nhập username không tồn tại', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'nouser');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', '123');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page.getByText('Sai tên đăng nhập hoặc mật khẩu')).toBeVisible({ timeout: 5000 });
  });

  test('TC-2.3: Chưa đăng nhập → /admin → redirect /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('TC-2.3: HV truy cập /admin → bị chặn', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'hocvien1');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', 'admin123');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page).toHaveURL(/\/student/, { timeout: 10000 });

    await page.goto('/admin');
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test('TC-2.3: HV truy cập /tutor → bị chặn', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'hocvien1');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', 'admin123');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page).toHaveURL(/\/student/, { timeout: 10000 });

    await page.goto('/tutor');
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/\/tutor/);
  });

  test('TC-2.4: Đăng xuất → quay về / và hiện nút Đăng Nhập', async ({ page }) => {
    await page.fill('div.auth-form-panel.active >> input[name="username"]', 'admin');
    await page.fill('div.auth-form-panel.active >> input[name="password"]', 'admin123');
    await page.locator('div.auth-form-panel.active >> button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    await page.click('text=Đăng xuất');
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });

    // Kiểm tra navbar hiện "Đăng Nhập" (link href="/login")
    await expect(page.locator('a[href="/login"]:has-text("Đăng Nhập")')).toBeVisible({ timeout: 5000 });
  });
});
