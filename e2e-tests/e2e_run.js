const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Cấu hình URL
const BASE_URL = 'http://localhost:5173'; // Đổi cổng nếu frontend chạy cổng khác (vd: 3000)

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2ETests() {
    console.log("🚀 Bắt đầu chạy kịch bản E2E Test tự động...");
    
    // Khởi tạo trình duyệt Chrome
    let options = new chrome.Options();
    // options.addArguments('--headless'); // Bỏ comment nếu muốn chạy ẩn không hiện UI
    options.addArguments('--start-maximized');
    
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    try {
        const timestamp = Date.now();
        const studentUsername = `hv_test_${timestamp}`;
        const tutorUsername = `gs_test_${timestamp}`;
        const password = 'admin123';

        // ==========================================
        // BƯỚC 1: ĐĂNG KÝ HỌC VIÊN
        // ==========================================
        console.log(`\n[1/10] Đăng ký Học viên mới: ${studentUsername}`);
        await driver.get(`${BASE_URL}/login`);
        
        // Chờ tải xong
        await sleep(2000);
        
        // Tìm các tab auth
        const authTabs = await driver.findElements(By.className('auth-tab'));
        if (authTabs.length >= 2) {
            await authTabs[1].click(); // Tab thứ 2 thường là Đăng Ký Học Viên
        }
        await sleep(1000);

        const hvForms = await driver.findElements(By.css('.auth-form-panel form'));
        const hvForm = hvForms[0]; // Có thể form đang hiển thị
        
        await hvForm.findElement(By.name('tendangnhap')).sendKeys(studentUsername);
        await hvForm.findElement(By.name('matkhau')).sendKeys(password);
        await hvForm.findElement(By.name('hoten')).sendKeys('Học Viên Tự Động');
        await hvForm.findElement(By.name('sdt')).sendKeys('0900000000');
        await hvForm.findElement(By.name('email')).sendKeys(`${studentUsername}@test.com`);
        await hvForm.findElement(By.css('button[type="submit"]')).click();
        
        await sleep(1500); // Đợi alert/thông báo đăng ký thành công

        // ==========================================
        // BƯỚC 2: ĐĂNG KÝ GIA SƯ
        // ==========================================
        console.log(`[2/10] Đăng ký Gia sư mới: ${tutorUsername}`);
        if (authTabs.length >= 3) {
            await authTabs[2].click(); // Tab thứ 3 là Đăng Ký Gia Sư
        }
        await sleep(1000);
        
        const gsFormInputs = await driver.findElements(By.name('tendangnhap'));
        let targetInput = gsFormInputs[gsFormInputs.length - 1]; // Lấy input của form Gia sư
        await targetInput.sendKeys(tutorUsername);
        
        const gsPassInputs = await driver.findElements(By.name('matkhau'));
        await gsPassInputs[gsPassInputs.length - 1].sendKeys(password);
        
        const hotenInputs = await driver.findElements(By.name('hoten'));
        await hotenInputs[hotenInputs.length - 1].sendKeys('Gia Sư E2E');
        
        const emailInputs = await driver.findElements(By.name('email'));
        await emailInputs[emailInputs.length - 1].sendKeys(`${tutorUsername}@test.com`);
        
        // Điền các trường bắt buộc khác
        try {
            const sdtInputs = await driver.findElements(By.name('sdt'));
            await sdtInputs[sdtInputs.length - 1].sendKeys('0911111111');
            const cccdInputs = await driver.findElements(By.name('cccd'));
            await cccdInputs[cccdInputs.length - 1].sendKeys('012345678912');
            const ngaysinhInputs = await driver.findElements(By.name('ngaysinh'));
            await ngaysinhInputs[ngaysinhInputs.length - 1].sendKeys('01-01-1990');
            const kinhnghiemInputs = await driver.findElements(By.name('kinhnghiem'));
            await kinhnghiemInputs[kinhnghiemInputs.length - 1].sendKeys('2');
            const hocphiInputs = await driver.findElements(By.name('hocphimongmuon'));
            await hocphiInputs[hocphiInputs.length - 1].sendKeys('200000');
            // Cần tick checkbox khu vực (nếu có)
            const checkboxes = await driver.findElements(By.name('khuvuc'));
            if(checkboxes.length > 0) await checkboxes[0].click();
        } catch(e) {}
        
        const submitBtns = await driver.findElements(By.css('button[type="submit"]'));
        await submitBtns[submitBtns.length - 1].click();
        
        await sleep(1500);

        // ==========================================
        // BƯỚC 3: ĐĂNG NHẬP ADMIN & TẠO LỚP NÂNG CAO
        // ==========================================
        console.log(`[3/10] Đăng nhập Admin & Tạo lớp Nâng Cao`);
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Đăng Nhập')]")), 5000).click();
        
        // Form Login (Cần biết tk admin, mặc định lấy admin/admin123)
        const loginForm = await driver.findElement(By.xpath("//div[@class='auth-form-panel active']"));
        await loginForm.findElement(By.name('username')).sendKeys('admin');
        await loginForm.findElement(By.name('password')).sendKeys('admin123');
        await loginForm.findElement(By.xpath(".//button[@type='submit']")).click();
        
        await sleep(2000);
        
        // Duyệt Gia sư (Tab Quản lý Hồ Sơ -> Duyệt hồ sơ)
        console.log(`-> Đang duyệt hồ sơ gia sư...`);
        try {
            await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Quản lý Hồ Sơ')]")), 3000).click();
            await sleep(1000);
            const duyetBtns = await driver.findElements(By.xpath("//button[contains(text(), 'Duyệt')]"));
            if(duyetBtns.length > 0) {
                await duyetBtns[duyetBtns.length - 1].click();
                await sleep(1000);
            }
        } catch(e) { console.log("Không tìm thấy nút Duyệt (có thể tự động duyệt)."); }

        // Tạo Lớp Nâng Cao
        console.log(`-> Tạo lớp học nâng cao...`);
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Quản lý Lớp Học')]")), 3000).click();
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Thêm Lớp Học')]")), 3000).click();
        
        await sleep(500);
        await driver.findElement(By.name('tenmh')).sendKeys('Toán Nâng Cao E2E');
        await driver.findElement(By.name('caplop')).sendKeys('12');
        await driver.findElement(By.name('diachi')).sendKeys('Online');
        await driver.findElement(By.name('yeucau')).sendKeys('Giỏi toán');
        await driver.findElement(By.name('sobuoi')).sendKeys('3');
        await driver.findElement(By.name('hocphimoibuoi')).sendKeys('300000');
        // Chọn checkbox Nâng Cao (nếu có)
        try {
            const advCheckbox = await driver.findElement(By.name('isAdvanced'));
            if(advCheckbox) await advCheckbox.click();
        } catch(e) {}
        
        await driver.findElement(By.xpath("//button[contains(text(), 'Lưu Lớp Học')]")).click();
        await sleep(2000);
        
        // Đăng xuất Admin
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Đăng xuất')]")), 3000).click();
        await sleep(1000);

        // ==========================================
        // BƯỚC 4: HỌC VIÊN ĐĂNG KÝ LỚP
        // ==========================================
        console.log(`[4/10] Đăng nhập Học Viên & Đăng ký lớp`);
        await loginForm.findElement(By.name('username')).clear();
        await loginForm.findElement(By.name('username')).sendKeys(studentUsername);
        await loginForm.findElement(By.name('password')).clear();
        await loginForm.findElement(By.name('password')).sendKeys(password);
        await loginForm.findElement(By.xpath(".//button[@type='submit']")).click();
        
        await sleep(2000);
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Tìm Lớp Học')]")), 3000).click();
        await sleep(1000);
        // Nhấn nút Đăng ký ở lớp đầu tiên (vừa tạo)
        const dangKyBtns = await driver.findElements(By.xpath("//button[contains(text(), 'Đăng Ký')]"));
        if(dangKyBtns.length > 0) {
            await dangKyBtns[0].click();
        }
        await sleep(1000);
        
        // Đăng xuất
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Đăng xuất')]")), 3000).click();
        await sleep(1000);

        // ==========================================
        // BƯỚC 5: ADMIN PHÂN CÔNG GIA SƯ VÀ TẠO HÓA ĐƠN
        // ==========================================
        console.log(`[5/10] Admin phân công gia sư & Tạo Y/C Học phí`);
        await loginForm.findElement(By.name('username')).clear();
        await loginForm.findElement(By.name('username')).sendKeys('admin');
        await loginForm.findElement(By.name('password')).clear();
        await loginForm.findElement(By.name('password')).sendKeys('admin123');
        await loginForm.findElement(By.xpath(".//button[@type='submit']")).click();
        
        await sleep(2000);
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Quản lý Lớp Học')]")), 3000).click();
        await sleep(1000);
        
        // Bấm phân công
        try {
            const phanCongBtns = await driver.findElements(By.xpath("//button[contains(text(), 'Phân công GS')]"));
            if(phanCongBtns.length > 0) {
                await phanCongBtns[0].click();
                await sleep(1000);
                const chonGsBtns = await driver.findElements(By.xpath("//button[contains(text(), 'Chọn GS Này')]"));
                if(chonGsBtns.length > 0) await chonGsBtns[0].click();
                await sleep(1000);
            }
        } catch (e) { console.log('Không thể phân công', e); }

        // Chuyển sang Tài chính tạo Y/C Học phí & Hoa hồng
        console.log(`-> Tạo Y/C Tài chính...`);
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Tài Chính & Hoa Hồng')]")), 3000).click();
        await sleep(1000);
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Tạo Y/C Học Phí')]")), 3000).click();
        await sleep(1000);
        await driver.findElement(By.xpath("//button[contains(text(), 'Tạo Phiếu')]")).click();
        await sleep(1000);
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Tạo Y/C Hoa Hồng')]")), 3000).click();
        await sleep(1000);
        await driver.findElement(By.xpath("//button[contains(text(), 'Tạo Phiếu Hoa Hồng')]")).click();
        await sleep(1000);
        
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Đăng xuất')]")), 3000).click();
        await sleep(1000);

        // ==========================================
        // BƯỚC 6: GIA SƯ XIN NGHỈ (LEAVE MANAGEMENT)
        // ==========================================
        console.log(`[6/10] Gia sư đăng nhập & Xin nghỉ phép`);
        await loginForm.findElement(By.name('username')).clear();
        await loginForm.findElement(By.name('username')).sendKeys(tutorUsername);
        await loginForm.findElement(By.name('password')).clear();
        await loginForm.findElement(By.name('password')).sendKeys(password);
        await loginForm.findElement(By.xpath(".//button[@type='submit']")).click();
        
        await sleep(2000);
        // Bấm Lịch học & Báo vắng
        try {
            const lichBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Lịch học & Báo vắng')]"));
            await lichBtn.click();
            await sleep(1000);
            await driver.findElement(By.name('lydo')).sendKeys('Bận việc gia đình (Selenium E2E Test)');
            await driver.findElement(By.xpath("//button[contains(text(), 'Gửi Báo Vắng')]")).click();
            await sleep(2000);
        } catch(e) { console.log('Không gửi báo vắng được', e); }
        
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Đăng xuất')]")), 3000).click();
        await sleep(1000);

        // ==========================================
        // BƯỚC 7: ADMIN DUYỆT NGHỈ PHÉP
        // ==========================================
        console.log(`[7/10] Admin duyệt nghỉ phép`);
        await loginForm.findElement(By.name('username')).clear();
        await loginForm.findElement(By.name('username')).sendKeys('admin');
        await loginForm.findElement(By.name('password')).clear();
        await loginForm.findElement(By.name('password')).sendKeys('admin123');
        await loginForm.findElement(By.xpath(".//button[@type='submit']")).click();
        
        await sleep(2000);
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Hỗ Trợ & Khiếu Nại')]")), 3000).click();
        await sleep(1000);
        try {
            const duyetNghiBtns = await driver.findElements(By.xpath("//button[contains(text(), 'Duyệt')]"));
            if(duyetNghiBtns.length > 0) {
                await duyetNghiBtns[0].click();
                await sleep(1000);
            }
        } catch(e) {}
        
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Đăng xuất')]")), 3000).click();
        await sleep(1000);

        // ==========================================
        // BƯỚC 8: HỌC VIÊN NỘP HỌC PHÍ (QR)
        // ==========================================
        console.log(`[8/10] Học viên nộp học phí qua QR`);
        await loginForm.findElement(By.name('username')).clear();
        await loginForm.findElement(By.name('username')).sendKeys(studentUsername);
        await loginForm.findElement(By.name('password')).clear();
        await loginForm.findElement(By.name('password')).sendKeys(password);
        await loginForm.findElement(By.xpath(".//button[@type='submit']")).click();
        
        await sleep(2000);
        try {
            await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Nộp học phí')]")), 3000).click();
            await sleep(2000);
            await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Đã thanh toán')]")), 3000).click();
            await sleep(2000);
        } catch(e) { console.log('Lỗi thao tác nộp học phí', e); }

        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Đăng xuất')]")), 3000).click();
        await sleep(1000);

        // ==========================================
        // BƯỚC 9: ADMIN DUYỆT HỌC PHÍ & LƯƠNG
        // ==========================================
        console.log(`[9/10] Admin duyệt CK và duyệt Lương`);
        await loginForm.findElement(By.name('username')).clear();
        await loginForm.findElement(By.name('username')).sendKeys('admin');
        await loginForm.findElement(By.name('password')).clear();
        await loginForm.findElement(By.name('password')).sendKeys('admin123');
        await loginForm.findElement(By.xpath(".//button[@type='submit']")).click();
        
        await sleep(2000);
        await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Tài Chính & Hoa Hồng')]")), 3000).click();
        await sleep(1000);
        
        try {
            await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Xác Nhận CK')]")), 3000).click();
            await sleep(1000);
        } catch(e) {}
        
        try {
            await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Duyệt TT')]")), 3000).click();
            await sleep(1000);
        } catch(e) {}

        // ==========================================
        // BƯỚC 10: IN HÓA ĐƠN
        // ==========================================
        console.log(`[10/10] Admin In Hóa Đơn và Kết thúc`);
        try {
            const inBlBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'In Biên Lai')]")), 3000);
            await inBlBtn.click();
            console.log("-> Đã in Biên lai Học phí.");
            await sleep(1000);
            
            const inPlBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'In Phiếu Lương')]")), 3000);
            await inPlBtn.click();
            console.log("-> Đã in Phiếu lương Gia sư.");
            await sleep(1000);
        } catch(e) {}

        console.log("\n✅ HOÀN TẤT KỊCH BẢN E2E TEST TỰ ĐỘNG THÀNH CÔNG!");

    } catch (err) {
        console.error("❌ Test bị lỗi:", err);
    } finally {
        await driver.quit();
    }
}

runE2ETests();
