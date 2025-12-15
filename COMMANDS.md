# 📋 Danh sách lệnh (Commands Reference)

## 🚀 Khởi động (Starting)

### Kiểm tra Docker

```powershell
.\check-docker.ps1
```

Kiểm tra Docker installation, daemon status, ports, và existing containers.

### Setup dependencies (chỉ chạy 1 lần)

```powershell
.\setup.ps1
```

Cài đặt Node.js dependencies cho tất cả services.

### Start services với Docker

```powershell
.\start.ps1
```

Build và start tất cả services trong Docker containers.

### Start services local (không dùng Docker)

```powershell
.\start-local.ps1
```

Yêu cầu PostgreSQL đang chạy trên localhost:5432.

### Start client application

```powershell
.\start-client.ps1
```

Khởi động interactive CLI client (tự động check services).

---

## 🛑 Dừng (Stopping)

### Stop tất cả services

```powershell
.\stop.ps1
```

### Stop và xóa volumes (reset database)

```powershell
docker compose down -v
```

---

## 📺 Demo Scripts

### Demo 1: Luồng bình thường

```powershell
.\demo-normal.ps1
```

- Register user với ECDSA keypair
- Login với signature
- Check balance
- Transfer money
- 3-layer verification

### Demo 2: Token theft attack

```powershell
.\demo-attack.ps1
```

- User login thành công
- Attacker đánh cắp token
- Attacker thử dùng token → BỊ CHẶN
- Chứng minh Holder-of-Key mechanism

### Demo 3: Traffic padding

```powershell
.\demo-padding.ps1
```

- So sánh packet size với/không padding
- Chứng minh traffic analysis prevention

---

## ✅ Testing

### Test toàn bộ hệ thống

```powershell
.\test.ps1
```

Test health checks và crypto functions.

### Test thủ công với curl

```powershell
# AAA Server
curl http://localhost:4001/health

# Gateway
curl http://localhost:4002/health

# App Service
curl http://localhost:4003/health
```

---

## 📋 Logs & Monitoring

### Xem logs tất cả services

```powershell
.\logs.ps1
```

### Xem logs của 1 service cụ thể

```powershell
docker compose logs -f aaa-server
docker compose logs -f gateway
docker compose logs -f app-service
docker compose logs -f postgres
```

### Xem logs 50 dòng cuối

```powershell
docker compose logs --tail=50
```

### Xem trạng thái containers

```powershell
docker compose ps
```

---

## 🔍 Debug & Troubleshooting

### Kiểm tra ports đang sử dụng

```powershell
netstat -ano | findstr "4001 4002 4003 5432"
```

### Vào container để debug

```powershell
docker compose exec aaa-server sh
docker compose exec gateway sh
docker compose exec app-service sh
docker compose exec postgres psql -U postgres -d zerotrust
```

### Restart 1 service

```powershell
docker compose restart aaa-server
docker compose restart gateway
docker compose restart app-service
docker compose restart postgres
```

### Xem resource usage

```powershell
docker stats
```

### Xem networks

```powershell
docker network ls
docker network inspect security_zerotrust-network
```

---

## 🗄️ Database Management

### Kết nối vào PostgreSQL

```powershell
docker compose exec postgres psql -U postgres -d zerotrust
```

### Xem các bảng

```sql
\dt
```

### Xem users

```sql
SELECT id, username, created_at FROM users;
```

### Xem audit logs

```sql
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;
```

### Backup database

```powershell
docker compose exec postgres pg_dump -U postgres zerotrust > backup.sql
```

### Restore database

```powershell
docker compose exec -T postgres psql -U postgres zerotrust < backup.sql
```

---

## 🧹 Cleanup

### Xóa tất cả (bao gồm database)

```powershell
docker compose down -v
```

### Xóa tất cả images

```powershell
docker compose down --rmi all
```

### Xóa toàn bộ Docker cache

```powershell
docker system prune -a --volumes
```

### Xóa node_modules (để reinstall)

```powershell
Remove-Item -Recurse -Force shared/node_modules
Remove-Item -Recurse -Force aaa-server/node_modules
Remove-Item -Recurse -Force gateway/node_modules
Remove-Item -Recurse -Force app-service/node_modules
Remove-Item -Recurse -Force client/node_modules
```

---

## 💻 Client Commands

### Start client

```powershell
.\start-client.ps1
```

### Start client thủ công

```powershell
cd client
node index.js
```

### Xóa keys đã lưu

```powershell
Remove-Item client/.storage/keys.json
```

---

## 🔄 Rebuild

### Rebuild tất cả từ đầu

```powershell
# Stop và xóa mọi thứ
docker compose down -v --rmi all

# Rebuild và start
.\start.ps1
```

### Rebuild 1 service cụ thể

```powershell
docker compose up -d --build aaa-server
docker compose up -d --build gateway
docker compose up -d --build app-service
```

---

## 📊 Monitoring

### Xem tất cả containers

```powershell
docker ps -a
```

### Xem logs theo thời gian thực

```powershell
docker compose logs -f --tail=100
```

### Top processes trong container

```powershell
docker compose top aaa-server
docker compose top gateway
docker compose top app-service
```

---

## 🎯 Quick Workflows

### Workflow 1: Start từ đầu

```powershell
.\check-docker.ps1    # Kiểm tra Docker
.\setup.ps1           # Cài dependencies (lần đầu)
.\start.ps1           # Start services
# Đợi 10-15 giây
.\test.ps1            # Test hệ thống
.\start-client.ps1    # Dùng client
```

### Workflow 2: Restart sau khi tắt máy

```powershell
# Mở Docker Desktop
.\check-docker.ps1    # Kiểm tra
.\start.ps1           # Start lại
.\start-client.ps1    # Dùng client
```

### Workflow 3: Reset và rebuild

```powershell
.\stop.ps1
docker compose down -v
.\start.ps1
```

### Workflow 4: Debug một service

```powershell
# Xem logs
docker compose logs -f gateway

# Vào container
docker compose exec gateway sh

# Restart service
docker compose restart gateway
```

---

## 📚 Tài liệu

- `START-HERE.md` - Bắt đầu nhanh
- `QUICKSTART.md` - Quick start guide
- `README.md` - Tài liệu đầy đủ
- `TROUBLESHOOTING.md` - Khắc phục sự cố
- `Project.md` - Kỹ thuật chi tiết
- `SUMMARY.md` - Tổng kết dự án
- `COMMANDS.md` - File này

---

**Tip:** Lưu file này lại để tham khảo nhanh các lệnh hữu ích! 📌
