# Troubleshooting Guide

## ❌ Error: "Docker is not running"

**Vấn đề:** Docker Desktop chưa được khởi động hoặc chưa cài đặt.

**Giải pháp:**

1. **Cài đặt Docker Desktop** (nếu chưa có):

   - Tải về: https://www.docker.com/products/docker-desktop
   - Chạy file cài đặt
   - Khởi động lại máy nếu cần

2. **Khởi động Docker Desktop**:

   - Mở Docker Desktop từ Start Menu
   - Đợi cho đến khi icon trong system tray ngừng chuyển động
   - Icon sẽ hiển thị "Docker Desktop is running"

3. **Kiểm tra trạng thái**:
   ```powershell
   .\check-docker.ps1
   ```

---

## ❌ Error: "Failed to start services"

**Nguyên nhân có thể:**

### 1. Port đã được sử dụng

**Kiểm tra:**

```powershell
netstat -ano | findstr "4001 4002 4003 5432"
```

**Giải pháp:**

- Dừng các ứng dụng đang dùng các port này
- Hoặc thay đổi port trong `docker-compose.yml`

### 2. Container cũ còn chạy

**Kiểm tra:**

```powershell
docker ps -a
```

**Giải pháp:**

```powershell
.\stop.ps1
docker compose down -v
.\start.ps1
```

### 3. Thiếu tài nguyên hệ thống

**Yêu cầu tối thiểu:**

- RAM: 4GB free
- Disk: 2GB free
- CPU: 2 cores

**Giải pháp:**

- Đóng các ứng dụng khác
- Tăng resource cho Docker Desktop:
  - Settings → Resources → Memory (tối thiểu 4GB)

---

## ❌ Error: "npm install failed"

**Nguyên nhân:** Node.js chưa cài đặt hoặc phiên bản cũ.

**Giải pháp:**

1. Cài đặt Node.js v18+:

   - Tải về: https://nodejs.org/
   - Chọn LTS version

2. Kiểm tra phiên bản:

   ```powershell
   node --version
   npm --version
   ```

3. Chạy lại setup:
   ```powershell
   .\setup.ps1
   ```

---

## ❌ Error: "Cannot connect to AAA Server"

**Nguyên nhân:** Services chưa sẵn sàng.

**Giải pháp:**

1. Kiểm tra services đang chạy:

   ```powershell
   docker compose ps
   ```

2. Xem logs:

   ```powershell
   .\logs.ps1
   ```

3. Đợi 10-15 giây sau khi start
4. Thử lại request

---

## ❌ Error: "Database connection failed"

**Nguyên nhân:** PostgreSQL chưa khởi động xong.

**Giải pháp:**

1. Xem logs của PostgreSQL:

   ```powershell
   docker compose logs postgres
   ```

2. Restart PostgreSQL:

   ```powershell
   docker compose restart postgres
   ```

3. Đợi health check pass:
   ```powershell
   docker compose ps
   ```
   (Status phải là "healthy")

---

## ⚠️ Warning: "Port conflicts"

**Các port được sử dụng:**

- 4001: AAA Server
- 4002: Gateway
- 4003: App Service
- 5432: PostgreSQL

**Thay đổi port:**

Sửa file `docker-compose.yml`:

```yaml
ports:
  - "4011:4001" # Đổi port ngoài thành 4011
```

Sau đó cập nhật `client/.env` và các demo scripts.

---

## 🔧 Commands hữu ích

### Khởi động lại toàn bộ:

```powershell
.\stop.ps1
docker compose down -v
.\start.ps1
```

### Xem logs realtime:

```powershell
.\logs.ps1
```

### Xem logs của 1 service:

```powershell
docker compose logs -f aaa-server
docker compose logs -f gateway
docker compose logs -f app-service
```

### Kiểm tra trạng thái:

```powershell
docker compose ps
```

### Vào container để debug:

```powershell
docker compose exec aaa-server sh
docker compose exec gateway sh
docker compose exec app-service sh
```

### Reset hoàn toàn (xóa database):

```powershell
docker compose down -v
docker system prune -a
.\start.ps1
```

---

## 🐛 Debug mode

### Chạy services local (không dùng Docker):

**Yêu cầu:** PostgreSQL phải chạy trên localhost:5432

```powershell
.\start-local.ps1
```

### Test từng service riêng:

**AAA Server:**

```powershell
cd aaa-server
node index.js
```

**Gateway:**

```powershell
cd gateway
node index.js
```

**App Service:**

```powershell
cd app-service
node index.js
```

---

## 📞 Hỗ trợ thêm

Nếu vẫn gặp vấn đề, thu thập thông tin sau:

1. Docker version:

   ```powershell
   docker --version
   docker compose version
   ```

2. System info:

   ```powershell
   systeminfo | findstr /C:"OS"
   ```

3. Logs:

   ```powershell
   .\logs.ps1 > logs.txt
   ```

4. Port status:
   ```powershell
   netstat -ano | findstr "4001 4002 4003 5432"
   ```
