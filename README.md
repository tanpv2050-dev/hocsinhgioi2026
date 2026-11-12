# Quản lý đội tuyển Tin học – Giai đoạn 1

MVP dùng Google Apps Script + Google Sheets + Google Drive, phù hợp thử nghiệm quy mô 20–30 học sinh. Không cần VPS.

## Chức năng
- Tài khoản admin/giáo viên/học sinh bằng username + password riêng.
- Tạo đội/nhóm, tạo tài khoản, phân nhóm.
- Tạo bài, giao toàn đội/nhóm/cá nhân, hạn nộp, số lượt nộp, phần mở rộng cho phép và file đề đính kèm.
- Học sinh nộp một file mỗi lượt (có thể nộp ZIP); lưu mọi lượt riêng biệt.
- Học sinh xem/tải bài của mình; giáo viên xem và tải bài nộp.
- Chấm bài hoàn toàn offline.

## Cài đặt
1. Mở https://script.google.com/ và tạo dự án mới.
2. Thay nội dung `Code.gs` bằng file cùng tên trong repo.
3. Tạo file HTML tên `Index`, dán nội dung `Index.html`.
4. Trong Project Settings, bật hiển thị manifest `appsscript.json`; thay bằng file trong repo.
5. Chọn hàm `setupSystem` và Run một lần, cấp quyền Google Sheets/Drive.
6. Mở Execution log để lấy URL Spreadsheet, URL thư mục Drive và mật khẩu admin tạm thời. Username ban đầu là `admin`.
7. Đăng nhập Web App và đổi mật khẩu admin.
8. Deploy > New deployment > Web app. Execute as: Me. Chọn quyền truy cập phù hợp với chính sách tài khoản Google của trường. Nếu muốn học sinh dùng username/password riêng mà không cần đăng nhập Google, thường cần chọn Anyone nếu tài khoản cho phép.
9. Gửi URL Web App cho học sinh.

**Không chạy `setupSystem()` lần thứ hai.** Giữ Spreadsheet và thư mục Drive ở chế độ riêng tư; không chia sẻ trực tiếp cho học sinh.

## Cấu trúc dữ liệu
- USERS: tài khoản, vai trò, đội/nhóm.
- TEAMS: đội/nhóm.
- ASSIGNMENTS: đề đã giao và cấu hình nộp.
- SUBMISSIONS: lịch sử nộp, ID file Drive.

## Lưu ý quan trọng
- Giới hạn file hiện tại 8 MB/lượt; mỗi lượt chỉ nhận một file.
- Chỉ kiểm tra phần mở rộng, không quét mã độc; không chạy code và không giải nén ZIP. File đề đính kèm và file bài nộp giới hạn 8 MB.
- Học sinh không có quyền truy cập trực tiếp Sheets/Drive; backend kiểm tra quyền trước khi trả dữ liệu/file.
- Phiên đăng nhập được lưu trong Apps Script Cache, có thể hết hạn sớm; khi đó đăng nhập lại.
- Apps Script/Drive có hạn mức theo loại tài khoản và có thể thay đổi. Cần thử nghiệm thực tế trước khi triển khai rộng.
- Bản này là MVP cần pilot, chưa có audit log chuyên sâu, rate-limit đăng nhập, thông báo, tải hàng loạt ZIP, nhập điểm, backup tự động hoặc cam kết SLA.
- Nên bật xác minh 2 bước cho tài khoản Google chủ sở hữu và sao lưu bảng tính/thư mục Drive định kỳ.
- Không đưa dữ liệu học sinh, mật khẩu, ID Spreadsheet/Drive thực tế hoặc file bài nộp lên GitHub.

## Đưa lên GitHub
Tạo repository mới, upload `Code.gs`, `Index.html`, `appsscript.json`, `README.md`, `.gitignore`. Có thể để public nếu repo chỉ chứa mã nguồn mẫu và không chứa dữ liệu thật.
