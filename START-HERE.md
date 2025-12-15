# 🚨 TRƯỚC KHI BẮT ĐẦU - ĐỌC ĐI!

## ⚠️ BƯỚC QUAN TRỌNG NHẤT

### 1. KHỞI ĐỘNG DOCKER DESKTOP

**Bạn PHẢI làm điều này trước:**

1. Tìm "Docker Desktop" trong Start Menu
2. Click để mở
3. Đợi icon trong system tray (góc dưới bên phải) ngừng chuyển động
4. Icon phải hiển thị: "Docker Desktop is running"

### 2. KIỂM TRA DOCKER

```powershell
.\check-docker.ps1
```

**Nếu thấy [OK] ở tất cả các bước → Tiếp tục**
**Nếu thấy [ERROR] → Xem TROUBLESHOOTING.md**

---

## ✅ SAU KHI DOCKER CHẠY

### Lần đầu sử dụng:

```powershell
# 1. Cài đặt dependencies
.\setup.ps1

# 2. Start services
.\start.ps1

# 3. Đợi 10-15 giây cho services khởi động

# 4. Test
.\test.ps1
```

### Sử dụng client:

```powershell
.\start-client.ps1
```

### Chạy demo:

```powershell
.\demo-normal.ps1    # Demo bình thường
.\demo-attack.ps1    # Demo tấn công
.\demo-padding.ps1   # Demo padding
```

---

## 🛑 DỪNG SERVICES

```powershell
.\stop.ps1
```

---

## ❌ GẶP LỖI?

### Error: "Docker is not running"

→ Bạn quên mở Docker Desktop!
→ Quay lại bước 1 ở trên

### Error: "Failed to start services"

→ Chạy: `.\check-docker.ps1`
→ Xem: `TROUBLESHOOTING.md`

### Error: "Port already in use"

→ Chạy: `.\stop.ps1`
→ Thử lại: `.\start.ps1`

### Services không response

→ Đợi 15 giây sau khi start
→ Xem logs: `.\logs.ps1`

---

## 📚 TÀI LIỆU CHI TIẾT

- **README.md** - Hướng dẫn đầy đủ
- **QUICKSTART.md** - Bắt đầu nhanh
- **TROUBLESHOOTING.md** - Khắc phục lỗi
- **Project.md** - Tài liệu kỹ thuật

---

## 🎯 CHECKLIST

- [ ] Docker Desktop đã mở và đang chạy
- [ ] Chạy `.\check-docker.ps1` thành công
- [ ] Chạy `.\setup.ps1` thành công
- [ ] Chạy `.\start.ps1` thành công
- [ ] Đợi 10-15 giây
- [ ] Chạy `.\test.ps1` để kiểm tra
- [ ] Sử dụng client hoặc demo

---

**LƯU Ý:** Nếu bạn tắt máy hoặc tắt Docker Desktop, bạn phải:

1. Mở Docker Desktop lại
2. Chạy `.\start.ps1`
3. Đợi services khởi động

**KHÔNG CẦN** chạy lại `.\setup.ps1` (chỉ chạy 1 lần)
