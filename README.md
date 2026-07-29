# Ứng Dụng Web Chat AI - Flask & Gemini API

Đây là một ứng dụng chatbot AI cao cấp, được phát triển bằng framework Flask (Python) và tích hợp mô hình ngôn ngữ lớn **Google Gemini 1.5 Flash**. Ứng dụng được thiết kế tối ưu, có giao diện web trực quan, mượt mà và đầy đủ các tính năng hiện đại.

---

## ✨ Các tính năng nổi bật

1. **Giao diện Glassmorphism hiện đại:** Sử dụng ngôn ngữ thiết kế tối màu với hiệu ứng kính mờ (glassmorphism), chuyển động (animations) mượt mà và tối ưu hóa trải nghiệm người dùng (UX).
2. **Hỗ trợ Markdown đầy đủ:** Trình dịch Markdown tự động hiển thị tiêu đề, danh sách, bảng, in đậm/in nghiêng,... từ câu trả lời của AI.
3. **Làm nổi bật cú pháp Code (Syntax Highlighting):** Các đoạn mã (Python, HTML, CSS, JavaScript, v.v.) được hiển thị trong khung chuyên dụng, phân biệt màu sắc cú pháp rõ ràng kèm nút **Copy** tiện lợi.
4. **Lưu lịch sử trò chuyện (Chat History):** Tự động lưu trữ các cuộc trò chuyện cũ vào bộ nhớ cục bộ (`localStorage`) của trình duyệt, cho phép người dùng quay lại hoặc xóa lịch sử bất cứ lúc nào.
5. **Cấu hình API Key linh hoạt:** 
   - Đọc trực tiếp từ tệp tin `.env` phía máy chủ.
   - Hoặc người dùng tự cấu hình/kiểm tra API Key cá nhân ngay trên giao diện Web thông qua bảng Cài đặt bảo mật.
6. **Thiết kế Responsive (Tương thích thiết bị di động):** Sidebar tự động ẩn và chuyển thành menu trượt trên màn hình điện thoại/máy tính bảng.

---

## 🛠️ Hướng dẫn cài đặt và chạy ứng dụng

### 1. Chuẩn bị môi trường
Yêu cầu máy tính đã cài đặt **Python 3.8** trở lên.

### 2. Tải mã nguồn về máy
Mở Terminal hoặc Command Prompt tại thư mục của dự án và cài đặt các thư viện cần thiết:
```bash
pip install -r requirements.txt
```

### 3. Cấu hình API Key
Có hai cách để cấu hình Gemini API Key:

* **Cách 1 (Khuyên dùng):** Tạo hoặc sửa tệp tin `.env` trong thư mục dự án và điền API Key của bạn:
  ```env
  GEMINI_API_KEY=AIzaSy...your_actual_key_here
  PORT=5000
  ```
  *(Bạn có thể đăng ký lấy API Key miễn phí tại [Google AI Studio](https://aistudio.google.com/))*

* **Cách 2:** Chạy trực tiếp ứng dụng lên, nhấp vào biểu tượng **Cài đặt API Key** (hình bánh răng hoặc góc dưới bên trái) trên giao diện web và dán API Key của bạn vào, sau đó nhấn **Lưu cấu hình**.

### 4. Khởi chạy ứng dụng Flask
Chạy lệnh sau trong Terminal/Command Prompt:
```bash
python app.py
```

Sau khi ứng dụng khởi chạy thành công, mở trình duyệt web và truy cập địa chỉ:
```
http://localhost:5000
```

---

## 🚀 Hướng dẫn đẩy dự án lên GitHub (Dành cho Sinh viên)

Để nộp bài tập theo yêu cầu của Giảng viên, bạn thực hiện các bước sau:

1. **Khởi tạo Git tại thư mục dự án `gemini_flask_chat`:**
   ```bash
   git init
   ```

2. **Thêm toàn bộ tệp tin vào hàng đợi của Git:**
   Tệp tin `.gitignore` đã được cấu hình sẵn để bỏ qua các thư mục tạm như `__pycache__` và khóa bí mật `.env` để bảo mật API Key của bạn.
   ```bash
   git add .
   ```

3. **Tạo Commit đầu tiên:**
   ```bash
   git commit -m "Initial commit - Flask Gemini Chatbot"
   ```

4. **Tạo repository mới trên trang web GitHub:**
   - Truy cập [github.com](https://github.com/) và đăng nhập tài khoản.
   - Nhấp vào nút **New** để tạo repository mới.
   - Đặt tên repository (ví dụ: `gemini-flask-chat`) và nhấn **Create repository**.

5. **Kết nối mã nguồn cục bộ với GitHub và Đẩy (Push) lên:**
   Copy các lệnh xuất hiện trên GitHub sau khi tạo repo (thay thế URL bằng link repo của bạn):
   ```bash
   git remote add origin https://github.com/tai-khoan-cua-ban/gemini-flask-chat.git
   git branch -M main
   git push -u origin main
   ```

---

## 📝 Hướng dẫn nộp bài tập

Theo yêu cầu của giai đoạn 3:
1. Tạo một tệp tin Microsoft Word (ví dụ: `Nop_Bai_GiaiDoan3_Phan1.docx`).
2. Dán đường dẫn liên kết đến repository GitHub bạn vừa đẩy lên (ví dụ: `https://github.com/tai-khoan-cua-ban/gemini-flask-chat`).
3. Truy cập hệ thống nộp bài tập lớp học, chọn phần **Nộp bài** và tải tệp tin Word lên, sau đó nhấn nút **Nộp** (Submit).
