# Japanese Learning Hub – 日本語学習室

Website học và ôn tập tiếng Nhật cá nhân cho người Việt, trình độ **N5**, theo giáo trình **できる日本語 初級 (Dekiru Nihongo)**, phạm vi **Bài 4–7**.

Chạy hoàn toàn trên trình duyệt, không cần backend. Tiến độ được lưu bằng `localStorage`.

> **Trạng thái:** đang phát triển. Repo hiện có prompt và dữ liệu nguồn; mã website sẽ được thêm vào sau khi dựng xong từng giai đoạn.

## Tính năng dự kiến

- **Furigana toàn site:** mọi chữ Kanji đều có cách đọc Hiragana đi kèm, có công tắc hiện/ẩn.
- **Từ điển tương tác:** rê chuột (máy tính) hoặc chạm (điện thoại) vào một từ để xem nghĩa, romaji, loại từ, các dạng chia, ví dụ, phát âm.
- **Từ vựng:** học theo bài, tìm kiếm, flashcard, đánh dấu từ khó.
- **Ngữ pháp:** 25 mẫu của Bài 4–7, có công thức, giải thích tiếng Việt, ví dụ kèm dịch.
- **Công cụ chia động từ và tính từ:** tự nhận nhóm, chia các thể ます / từ điển / て / ない / た / 可能 / たい, giải thích từng bước, có chuyên đề thể て.
- **Luyện tập và kiểm tra:** nhiều dạng bài, giải thích lỗi sai, sổ lỗi sai, đề kiểm tra theo bài hoặc tổng hợp.
- **Ôn tập ngắt quãng (SRS):** gợi ý ôn đúng thứ cần ôn mỗi ngày.
- **Cá nhân hóa:** lưu tiến độ, đặt lại, xuất/nhập dữ liệu học dạng JSON.

## Nội dung trong repo

```
japanese-learning-hub/
├── README.md
└── docs/
    ├── Prompt_Japanese_Learning_Hub_v2_Bai4-7.md   # prompt dùng để dựng website
    └── du_lieu_bai_4-7.json                        # dữ liệu nguồn chuẩn
```

Khi website hoàn thành, cấu trúc dự kiến thêm: `index.html`, `css/`, `js/`, `data/data.js`.

## Dữ liệu nguồn (`du_lieu_bai_4-7.json`)

| Phần | Nội dung |
|---|---|
| `vocab` | 225 mục: 173 từ học (`study`), 34 từ phụ cho ví dụ (`extra`), 17 động từ cho công cụ chia (`engine`), 1 từ nền (`foundation`) |
| `grammar` | 25 mẫu ngữ pháp, 52 câu ví dụ |
| `particles` | 16 trợ từ |
| `goldenTests` | 52 ca chia động từ và 32 ca chia tính từ để kiểm thử |
| `sourceIssues` | Các điểm cần lưu ý của tài liệu gốc |

Furigana dùng một chuẩn duy nhất: `{漢字|かんじ}`, hiển thị bằng thẻ `<ruby>`.

**Phân biệt nguồn nội dung:**
- Dữ liệu có `source: "sotay-b4"` … `"sotay-b7"` đến từ sổ tay ôn tập của người học.
- Dữ liệu có `source: "n5-core"` là từ N5 phổ biến, bổ sung để ví dụ tra cứu được.
- Nội dung do AI biên soạn thêm được gắn `ai-authored` và `needsReview: true`, cần đối chiếu với tài liệu lớp.

## Cách dựng website

1. Mở một cuộc trò chuyện mới với AI bạn dùng.
2. Dán nội dung `docs/Prompt_Japanese_Learning_Hub_v2_Bai4-7.md` và đính kèm `docs/du_lieu_bai_4-7.json`.
3. Làm theo từng giai đoạn trong prompt (1 → 4), kiểm tra kết quả ở cuối mỗi giai đoạn rồi mới gõ "tiếp tục".
4. Chép mã nhận được vào repo.

## Chạy trên máy

Website là HTML thuần. Mở trực tiếp `index.html` bằng trình duyệt, hoặc chạy máy chủ tĩnh cho tiện:

```bash
python3 -m http.server 8000
# mở http://localhost:8000
```

## Triển khai bằng GitHub Pages

1. Vào **Settings → Pages**.
2. Chọn **Deploy from a branch**, nhánh `main`, thư mục `/ (root)`.
3. Sau 1–2 phút, truy cập `https://TEN-CUA-BAN.github.io/japanese-learning-hub/`.

Lưu ý: dùng đường dẫn tương đối (`./js/app.js`) trong mã nguồn, và nhớ rằng tiến độ học lưu theo từng trình duyệt. Dùng chức năng xuất/nhập JSON để chuyển sang thiết bị khác.

## Lưu ý về nội dung

- Danh sách từ vựng là danh sách ôn tập chọn lọc theo chủ đề, **không phải toàn bộ mục từ của giáo trình**. Khi tài liệu lớp khác với dữ liệu ở đây, hãy ưu tiên tài liệu lớp.
- Dự án phục vụ mục đích tự học cá nhân. Dekiru Nihongo là sản phẩm có bản quyền của chủ sở hữu; repo không chứa nguyên văn giáo trình.
- Chưa có dữ liệu thứ tự nét viết Kanji.

## Phạm vi

Chỉ Bài 4, 5, 6, 7. Bài 3 đã được loại khỏi dự án.
