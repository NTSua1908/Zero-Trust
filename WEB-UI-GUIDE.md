# 🌐 Web UI Guide

## Giới thiệu

Web UI là giao diện web hiện đại cho Zero Trust demo, cung cấp trải nghiệm trực quan hơn so với CLI client.

## Tính năng

### 1. Giao diện 2 cột

**Cột trái: Actions (Thao tác)**

- Form đăng ký & đăng nhập
- Hiển thị thông tin user (username, public key, token)
- Hiển thị số dư tài khoản
- Các nút thao tác: Check Balance, Transfer, History
- Demo tấn công (Token Theft)

**Cột phải: Logs (Nhật ký chi tiết)**

- Logs theo thời gian thực
- Màu sắc phân loại: Info (xanh), Success (xanh lá), Error (đỏ), Warning (vàng)
- Chi tiết mỗi request: timestamp, payload, signature, response
- Auto-scroll xuống dưới khi có log mới

### 2. Hiển thị 3 lớp bảo mật

Khi thực hiện request, Web UI hiển thị 3 lớp verification:

```
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Layer 1 │ │ Layer 2 │ │ Layer 3 │
│  HMAC   │ │  Token  │ │Signature│
└─────────┘ └─────────┘ └─────────┘
```

- Xanh = Verified ✓
- Xám = Not verified

### 3. Logs chi tiết cho demo

Mỗi thao tác được log với đầy đủ thông tin:

**Đăng ký:**

- ✅ Generating Ed25519 key pair
- Public Key: 04abcd...
- Private Key: [PROTECTED]
- Registration successful

**Đăng nhập:**

- 🔐 Starting login process
- 🖊️ Signing with Ed25519
- 📤 Sending to Gateway
- ✅ Token received

**Check Balance:**

- 💰 Checking balance
- 📤 Layer 1: Gateway HMAC
- 📤 Layer 2: JWT Token
- 📤 Layer 3: Ed25519 Signature
- ✅ All 3 layers verified
- Balance: 1,000,000 VND

**Transfer:**

- 💸 From: alice → To: bob
- Amount: 50,000 VND
- 📤 Signed request
- ✅ Transfer successful
- New balance: 950,000 VND

**Token Theft Attack:**

- ⚠️ DEMO: Simulating attack
- 🔓 Attacker steals token
- 👹 Trying without signature
- ✅ ATTACK BLOCKED!
- Reason: Missing signature
- Layer failed: Layer 3

## Cách sử dụng

### 1. Start backend services

```powershell
.\start.ps1
```

### 2. Start Web UI

```powershell
.\start-webui.ps1
```

### 3. Mở browser

Truy cập: http://localhost:3000

### 4. Workflow demo

**A. Đăng ký user mới:**

1. Nhập username (vd: alice)
2. Click "Generate Keys & Register"
3. Quan sát logs:
   - Key generation
   - Registration request
   - Server response
4. Keys được lưu vào localStorage

**B. Đăng nhập:**

1. Click "Login with Ed25519 Signature"
2. Quan sát logs:
   - Signing process
   - Request details
   - Token received
3. UI chuyển sang chế độ đã đăng nhập

**C. Kiểm tra số dư:**

1. Click "Check Balance"
2. Quan sát:
   - 3 lớp verification sáng lên lần lượt
   - Chi tiết từng layer trong logs
   - Số dư hiển thị lên

**D. Chuyển tiền:**

1. Nhập tên người nhận (vd: bob)
2. Nhập số tiền (vd: 50000)
3. Click "Transfer Money"
4. Quan sát:
   - Request được sign
   - Verification qua 3 layers
   - Số dư cập nhật

**E. Demo tấn công:**

1. Click "Simulate Token Theft Attack"
2. Quan sát logs:
   - Token bị đánh cắp
   - Request không có signature
   - Layer 3 chặn request
   - Attack failed!

## So sánh với CLI Client

| Feature                | Web UI                 | CLI Client         |
| ---------------------- | ---------------------- | ------------------ |
| Giao diện              | ✅ Đẹp, trực quan      | ❌ Text-based      |
| Logs chi tiết          | ✅ Realtime, màu sắc   | ❌ Console.log     |
| 3-layer visualization  | ✅ Hiển thị trực quan  | ❌ Không có        |
| Demo attacks           | ✅ 1 click             | ⚠️ Phức tạp        |
| Dễ demo cho người khác | ✅ Rất dễ              | ⚠️ Cần hiểu CLI    |
| Storage                | localStorage (browser) | .storage/keys.json |
| Crypto                 | Web Crypto API         | Node.js crypto     |

## Kỹ thuật

### Frontend

- **HTML/CSS**: Responsive design, gradient backgrounds
- **JavaScript**: Vanilla JS, không dùng framework
- **TweetNaCl**: Ed25519 signing
- **LocalStorage**: Lưu keys trong browser

### Backend

- **Express.js**: Serve static files
- **CORS enabled**: Cho phép frontend gọi API
- **Port 3000**: Web UI server

### Security

- Keys được lưu trong localStorage (demo only!)
- Production nên dùng secure storage
- HTTPS nên được bật trong production
- CORS nên được configure cẩn thận

## Troubleshooting

### Web UI không load

```powershell
# Kiểm tra server đang chạy
Get-Process -Name node | Where-Object {$_.Path -like "*web-ui*"}

# Kiểm tra port
netstat -ano | findstr :3000
```

### Backend API không kết nối

```powershell
# Kiểm tra services
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
```

### CORS errors trong browser console

Đảm bảo:

- Gateway có `cors()` enabled
- Headers được gửi đúng
- Frontend đang chạy trên http://localhost:3000

### Keys không load sau refresh

Keys được lưu trong localStorage:

- F12 → Application → Local Storage → http://localhost:3000
- Kiểm tra key `zerotrust_keys`

### Crypto errors

Web Crypto API khác với Node.js crypto:

- Dùng Ed25519 (Curve25519) thay vì ECDSA secp256k1
- Keys có format khác
- Nếu load keys từ CLI client, có thể không tương thích

## Best Practices

### Khi demo cho người khác:

1. **Chuẩn bị trước:**

   - Start backend services trước
   - Clear logs cũ
   - Chuẩn bị 2 browser tabs (2 users)

2. **Workflow demo:**

   - Tab 1: alice đăng ký & đăng nhập
   - Tab 2: bob đăng ký & đăng nhập
   - alice check balance
   - alice transfer sang bob
   - bob check balance để thấy tiền nhận được
   - Demo attack: Token theft không thành công

3. **Nhấn mạnh:**
   - 3 lớp verification
   - Logs chi tiết mỗi bước
   - Attack bị chặn ở Layer 3
   - Non-repudiation với digital signatures

### Khi present:

- Zoom vào browser (Ctrl + Plus)
- Share screen với full browser
- Mở F12 Console nếu cần debug
- Giải thích từng log khi nó xuất hiện

## Mở rộng

### Thêm tính năng:

1. **QR Code cho keys**: Scan để import/export
2. **Transaction history UI**: Hiển thị dạng table
3. **Charts**: Visualize transaction flow
4. **Multiple accounts**: Switch giữa các users
5. **Dark mode**: Toggle theme

### Cải thiện security:

1. **Encrypted storage**: Encrypt keys trước khi lưu
2. **Session timeout**: Auto logout sau X phút
3. **Rate limiting**: Giới hạn số request
4. **CSP headers**: Content Security Policy
5. **HTTPS only**: Force secure connection

## Kết luận

Web UI làm cho Zero Trust demo trở nên:

- ✅ Dễ hiểu hơn
- ✅ Trực quan hơn
- ✅ Dễ demo hơn
- ✅ Professional hơn

Phù hợp cho:

- Presentations
- Teaching/Training
- Client demos
- Security awareness

CLI client vẫn hữu ích cho:

- Development/Testing
- Automation
- CI/CD integration
- Power users
