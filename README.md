# 🔐 Zero Trust Architecture - Demo Project

> **Kiến trúc Bảo mật Zero Trust với Cơ chế Ký số và Xác thực Đa lớp**

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
- [Cơ chế bảo mật](#cơ-chế-bảo-mật)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
- [Sử dụng](#sử-dụng)
- [Demo Scenarios](#demo-scenarios)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## 🎯 Tổng quan

Dự án này xây dựng một mô hình **Zero Trust (Không tin cậy bất kỳ ai)** áp dụng cho các hệ thống yêu cầu bảo mật cao như tài chính/ngân hàng.

### Đặc điểm cốt lõi:

- ✅ **Zero Trust Architecture**: Không tin tưởng tuyệt đối vào bất kỳ thành phần nào
- ✅ **3-Layer Verification**: Gateway HMAC → Token → User Signature
- ✅ **Holder-of-Key**: Token + Private Key đều cần thiết
- ✅ **Digital Signatures**: ECDSA trên mọi request
- ✅ **Traffic Analysis Prevention**: Padding packets về kích thước cố định
- ✅ **Non-repudiation**: Chống chối bỏ với audit logs

## 🏗️ Kiến trúc hệ thống

```
┌─────────────┐
│   Client    │  🔑 Private Key (ECDSA)
│  (Browser/  │  🎫 Access Token
│     App)    │  ✍️  Signs every request
└──────┬──────┘
       │
       │ HTTPS
       ▼
┌─────────────┐
│   Gateway   │  🚪 Entry point
│   (Port     │  🔒 HMAC signing
│    4002)    │  📋 Request routing
└──────┬──────┘
       │
       ├────────────────┬────────────────┐
       │                │                │
       ▼                ▼                ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│   AAA    │    │   App    │    │ Postgres │
│  Server  │    │ Service  │    │    DB    │
│  (4001)  │    │  (4003)  │    │  (5432)  │
└──────────┘    └──────────┘    └──────────┘
   📁 Users         💰 Business       🗄️ Data
   🔐 Auth          ✅ 3-Layer        📝 Logs
   🎫 Tokens        Verification
```

### Thành phần:

1. **Client**: Tạo keypair, ký requests với ECDSA
2. **Gateway**: Proxy, HMAC wrapping cho internal communication
3. **AAA Server**: Authentication, Authorization, Accounting
4. **App Service**: Business logic với 3-layer verification (Zero Trust)
5. **PostgreSQL**: Lưu trữ public keys, user data và audit logs
6. **Vault**: Secrets management với AES-256-GCM encryption

### Kiến trúc hoàn chỉnh (5 components)

- ✅ Shared Library: Crypto functions (ECDSA, HMAC, Padding, JWT)
- ✅ AAA Server (Port 4001): Authentication, Authorization, Accounting
- ✅ Gateway (Port 4002): HMAC wrapping & routing
- ✅ App Service (Port 4003): 3-layer verification + business logic
- ✅ Web UI (Port 3000): Interactive web interface với logs chi tiết
- ✅ Client CLI: Interactive menu cho user (dòng lệnh)

## 🔒 Cơ chế bảo mật

### 1. ECDSA Digital Signature (Asymmetric)

- User giữ **Private Key** bí mật
- Server lưu **Public Key** để verify
- Mỗi request được ký bởi Private Key
- Chống chối bỏ (Non-repudiation)

### 2. HMAC (Symmetric)

- Gateway và App chia sẻ **Secret Key**
- Gateway ký HMAC cho mọi request nội bộ
- App verify HMAC để xác thực Gateway

### 3. Holder-of-Key (Proof of Possession)

- Token đơn thuần **KHÔNG ĐỦ**
- Cần có cả Token + Private Key
- Ngăn chặn token theft attacks

### 4. Traffic Padding

- Mọi packet được padding về **4KB**
- Attacker không đoán được loại giao dịch
- Chống traffic analysis

### 5. 3-Layer Verification (Zero Trust)

```
Request → [Layer 1: HMAC]     → Verify Gateway (Secret từ Vault)
       → [Layer 2: Token]     → Verify JWT locally (Secret từ Vault)
       → [Layer 3: Signature] → Verify User (Public Key từ DB + Cache)
       → ✅ Process Request
```

**Đặc biệt**: App Service **không phụ thuộc AAA Server** khi xử lý request, đúng tinh thần Zero Trust.

### 6. Secrets Management (Vault)

- **AES-256-GCM Encryption**: Mọi secrets được mã hóa
- **Centralized Management**: HMAC và JWT secrets được quản lý tập trung
- **Audit Trail**: Mọi truy cập secret đều được log
- **Key Rotation**: Hỗ trợ rotation với history tracking

## 💻 Yêu cầu hệ thống

- **Node.js**: v18 trở lên
- **Docker Desktop**: (Khuyến nghị) - **PHẢI ĐANG CHẠY**
- **PostgreSQL**: v15+ (nếu chạy local mode)
- **PowerShell**: Windows PowerShell 5.1+
- **RAM**: Tối thiểu 4GB
- **Disk**: 2GB trống

### ⚠️ Quan trọng: Docker Desktop

**Trước khi chạy bất kỳ lệnh nào, đảm bảo Docker Desktop đang chạy:**

1. Mở **Docker Desktop** từ Start Menu
2. Đợi cho icon trong system tray ngừng chuyển động
3. Icon phải hiển thị "Docker Desktop is running"

**Kiểm tra Docker:**

```powershell
.\check-docker.ps1
```

## 📦 Cài đặt

### Bước 1: Clone/Extract project

```powershell
cd d:\Code\security
```

### Bước 2: Chạy setup script

```powershell
.\setup.ps1
```

Script này sẽ:

- ✅ Kiểm tra Docker
- ✅ Cài đặt dependencies cho tất cả services
- ✅ Chuẩn bị môi trường

## 🚀 Sử dụng

### Chế độ 1: Docker (Khuyến nghị)

```powershell
# Start all services
.\start.ps1

# View logs
.\logs.ps1

# Stop services
.\stop.ps1
```

### Chế độ 2: Local (Không dùng Docker)

```powershell
# Yêu cầu: PostgreSQL đang chạy
.\start-local.ps1
```

### Sử dụng Client

**Tùy chọn 1: Web UI (Giao diện đẹp + Logs chi tiết)**

```powershell
.\start-webui.ps1
```

Mở browser tại: http://localhost:3000

Web UI cung cấp:

- Giao diện đẹp, dễ sử dụng
- Logs chi tiết theo thời gian thực
- Hiển thị 3 lớp bảo mật (HMAC, Token, Signature)
- Demo các cuộc tấn công (Token Theft)

**Tùy chọn 2: CLI Client (Dòng lệnh)**

```powershell
.\start-client.ps1
```

Hoặc thủ công:

```powershell
cd client
node index.js
```

Menu sẽ hiện ra:

```
1. Register new user
2. Login
3. Check balance
4. Transfer money
5. View transaction history
```

## 🎭 Demo Scenarios

### Demo 1: Normal Flow (Luồng bình thường)

```powershell
.\demo-normal.ps1
```

Kịch bản:

1. ✅ Tạo user với ECDSA keypair
2. ✅ Login với signature
3. ✅ Check balance (3-layer verification)
4. ✅ Transfer money

### Demo 2: Token Theft Attack (Tấn công đánh cắp token)

```powershell
.\demo-attack.ps1
```

Kịch bản:

1. 👤 User login thành công
2. 🦹 Hacker đánh cắp token
3. 🦹 Hacker thử dùng token
4. ❌ **Request bị từ chối** (thiếu Private Key)

### Demo 3: Traffic Analysis Prevention

```powershell
.\demo-padding.ps1
```

Kịch bản:

- So sánh kích thước packets với/không padding
- Chứng minh attacker không đoán được loại giao dịch

### Demo 4: System Test

```powershell
.\test.ps1
```

Kiểm tra:

- ✅ Health checks của tất cả services
- ✅ Crypto functions (ECDSA, HMAC, Padding, JWT)

## 📁 Cấu trúc dự án

```
d:\Code\security\
├── shared/                  # Shared crypto library
│   ├── crypto.js           # ECDSA, HMAC, Padding, JWT
│   └── package.json
│
├── aaa-server/             # AAA Server (Port 4001)
│   ├── index.js            # Main server
│   ├── Dockerfile
│   └── package.json
│
├── web-ui/                 # Web UI (Port 3000)
│   ├── index.html          # Main HTML interface
│   ├── app.js              # Frontend logic & crypto
│   ├── server.js           # Express server
│   └── package.json
│
├── gateway/                # Gateway (Port 4002)
│   ├── index.js            # Proxy + HMAC
│   ├── Dockerfile
│   └── package.json
│
├── app-service/            # App Service (Port 4003)
│   ├── index.js            # 3-layer verification
│   ├── Dockerfile
│   └── package.json
│
├── client/                 # Client CLI
│   ├── index.js            # Interactive menu
│   └── .storage/           # Keys storage
│
├── docker-compose.yml      # Docker orchestration
│
├── check-docker.ps1        # ✅ Check Docker status
├── setup.ps1               # 🔧 Setup script
├── start.ps1               # 🚀 Start (Docker)
├── start-local.ps1         # 🚀 Start (Local)
├── start-webui.ps1         # 🌐 Start Web UI
├── start-client.ps1        # 💻 Start CLI client
├── stop.ps1                # 🛑 Stop services
├── logs.ps1                # 📋 View logs
├── test.ps1                # ✅ Run tests
│
├── demo-normal.ps1         # 📺 Normal flow demo
├── demo-attack.ps1         # 📺 Attack demo
└── demo-padding.ps1        # 📺 Padding demo
```

## 📚 API Documentation

### AAA Server (Port 4001)

#### POST /register

Đăng ký user mới với public key.

**Request:**

```json
{
  "username": "user123",
  "publicKey": "04abcdef..."
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "user123"
  }
}
```

#### POST /login

Login với ECDSA signature.

**Request:**

```json
{
  "username": "user123",
  "timestamp": 1702654321,
  "signature": "30440220..."
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "user123"
  }
}
```

#### POST /verify-token

Verify JWT token (internal use).

**Request:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Gateway (Port 4002)

#### POST /login

Proxy tới AAA Server.

#### POST /register

Proxy tới AAA Server.

#### POST /api/:endpoint

Main API gateway với HMAC wrapping.

**Request structure:**

```json
{
  "meta": {
    "timestamp": 1702654321,
    "version": "1.0"
  },
  "protected_payload": {
    "data": { ... },
    "padding": "...",
    "token": "..."
  },
  "user_signature": "30440220..."
}
```

### App Service (Port 4003)

#### POST /internal/balance

Lấy số dư (3-layer verification).

#### POST /internal/transfer

Chuyển tiền (3-layer verification).

**Payload data:**

```json
{
  "receiver": "user456",
  "amount": 100000
}
```

#### POST /internal/history

Lịch sử giao dịch (3-layer verification).

## 🔍 Troubleshooting

### Services không start được

```powershell
# Kiểm tra Docker
docker ps

# Xem logs chi tiết
.\logs.ps1

# Restart services
.\stop.ps1
.\start.ps1
```

### Port đã được sử dụng

Thay đổi ports trong `docker-compose.yml`:

```yaml
ports:
  - "4001:4001" # Đổi thành "4011:4001"
```

### Client không kết nối được

Kiểm tra services đang chạy:

```powershell
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
```

### Web UI không tải được

```powershell
# Kiểm tra Web UI server
curl http://localhost:3000/health

# Kiểm tra browser console (F12) để xem lỗi CORS hoặc network
# Đảm bảo backend services đang chạy
```

### Database connection error

```powershell
# Restart PostgreSQL container
docker compose restart postgres

# Check logs
docker compose logs postgres
```

### Crypto errors

```powershell
# Reinstall dependencies
cd shared
npm install

cd ../aaa-server
npm install
# ... repeat for all services
```

## 🎓 Giải thích chi tiết

### Tại sao cần 3 lớp xác thực?

1. **Layer 1 (HMAC)**: Đảm bảo request đến từ Gateway thật
2. **Layer 2 (Token)**: Đảm bảo user đã đăng nhập
3. **Layer 3 (Signature)**: Đảm bảo user có Private Key (Holder-of-Key)

### Holder-of-Key hoạt động như thế nào?

```
Attacker có:     Token ✅
Attacker KHÔNG có: Private Key ❌

Request = Token + Signature(Data, PrivateKey)
         ✅           ❌

Server verify:
  - Token valid? ✅
  - Signature match PublicKey in Token? ❌
  → Request REJECTED
```

### Padding ngăn chặn gì?

Không có padding:

```
Balance request:  150 bytes  → Attacker biết: "Đang check balance"
Transfer request: 350 bytes  → Attacker biết: "Đang chuyển tiền"
```

Có padding:

```
Balance request:  4096 bytes
Transfer request: 4096 bytes
→ Attacker KHÔNG biết đang làm gì
```

## 📝 License

Educational project - MIT License

## 👥 Contributors

- Zero Trust Architecture Implementation
- Security Research & Development

## 🙏 Acknowledgments

- ECDSA: elliptic library
- Express.js framework
- PostgreSQL database
- Docker containerization

---

**⚠️ LƯU Ý:** Đây là dự án demo cho mục đích học tập. Để sử dụng trong production, cần:

- Thêm rate limiting
- Implement proper key management (HSM)
- Add monitoring & alerting
- Enhance audit logging
- Use HTTPS/TLS cho tất cả connections
- Implement key rotation
- Add more comprehensive error handling

---

🔐 **Zero Trust: "Never trust, always verify"**
