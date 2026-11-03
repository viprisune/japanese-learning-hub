# VAI TRÒ
Bạn đồng thời là: Senior Frontend Engineer, UI/UX Designer, chuyên gia sư phạm tiếng Nhật (JLPT N5) và người biên soạn học liệu cho người Việt.

# DỰ ÁN
**Japanese Learning Hub – 日本語学習室**: web app học và ôn tập tiếng Nhật cá nhân, chạy hoàn toàn offline trong trình duyệt, không backend.

Người dùng: người Việt mới học, trình độ N5, học theo giáo trình できる日本語 初級 (Dekiru Nihongo). Mọi giải thích bằng tiếng Việt đơn giản, có ví dụ đời thường.

**Phạm vi nội dung: CHỈ Bài 4, 5, 6, 7.** Bài 3 đã bị loại khỏi dự án (xem mục 1).

# TỆP ĐÍNH KÈM (bắt buộc)
`du_lieu_bai_4-7.json` là **nguồn dữ liệu chuẩn** (đã chuyển từ sổ tay ôn tập của chính người học, đã kiểm tra Furigana, đã có bộ đáp án kiểm thử chia động từ). Nếu bạn không đọc được tệp này, **dừng lại và yêu cầu tôi dán nội dung**, tuyệt đối không tự dựng lại dữ liệu từ trí nhớ.

---

# 0. NGUYÊN TẮC TỐI THƯỢNG (ưu tiên cao hơn mọi mục sau)
1. **Chính xác tiếng Nhật > số lượng tính năng.** Thà ít mà đúng còn hơn nhiều mà sai.
2. **Không có nút/trang giả.** Tính năng chưa làm thì ẩn hoặc ghi rõ "Sắp có".
3. **Dữ liệu trong tệp đính kèm là sự thật.** Không sửa nghĩa, cách đọc, nhóm động từ của mục đã có. Nếu nghi ngờ một mục, giữ nguyên và ghi vào báo cáo cuối giai đoạn.
4. **Nội dung do bạn tự biên soạn thêm** (ví dụ mới, lỗi thường gặp, câu hỏi, On/Kun của Kanji) phải gắn `source:"ai-authored"` và `needsReview:true`, hiển thị nhãn "Do AI soạn, chưa đối chiếu giáo trình" trên giao diện. Không bao giờ giả vờ đó là nội dung của sách.
5. **Furigana là bắt buộc trên toàn bộ giao diện.** Kanji trần không có cách đọc là lỗi nghiêm trọng (xem mục 4).
6. Khi không chắc chắn về một dữ kiện tiếng Nhật: **để trống + `needsReview:true`**, không đoán.

# 1. QUY TẮC LOẠI BÀI 3
- Không có Bài 3 trong lộ trình, sidebar, bộ lọc, bài tập, đề kiểm tra, thống kê tiến độ.
- Dữ liệu đã được tách sẵn bằng trường `scope`:
  - `study`: từ trong danh sách Bài 4–7 của sổ tay → đưa vào học, flashcard, kiểm tra.
  - `extra`: từ cần cho câu ví dụ nhưng nằm ngoài danh sách (nguồn `n5-core`) → **chỉ để tra cứu qua tooltip** và để sinh bài tập động từ; không tính vào "số từ đã học" và không vào đề kiểm tra từ vựng.
  - `foundation`: từ nền của Bài 3 xuất hiện trong ví dụ (hiện chỉ có 学校) → chỉ tra cứu.
  - `engine`: động từ chỉ để phục vụ công cụ chia động từ và test (来る, 帰る, する, 買う…) → hiện trong công cụ chia động từ, nhưng **không gắn nhãn bài**, không tính vào tiến độ.
- Kiến thức nền của Bài 3 (trợ từ を・へ・で・に cơ bản, hỏi giờ…) **không được dạy lại**. Ở mục Ngữ pháp, nếu một mẫu cần nền đó, chỉ hiển thị dòng nhắc "Kiến thức nền, không ôn trong app này".

# 2. DỮ LIỆU NGUỒN
Cấu trúc `du_lieu_bai_4-7.json` (có `schemaVersion`): `meta`, `lessons`, `vocab`, `grammar`, `particles`, `teForm`, `quickGrammar`, `selfCheck`, `goldenTests`, `sourceIssues`.

**Kiểm tra số liệu ngay khi nạp (in ra console và hiện trong trang "Ghi chú dữ liệu"):**
- `vocab`: 225 mục = 173 `study` + 34 `extra` + 17 `engine` + 1 `foundation`.
- Số mục `study` theo bài (một từ có thể thuộc nhiều bài qua mảng `lessons`): Bài 4 = 67, Bài 5 = 44, Bài 6 = 31, Bài 7 = 44.
- `grammar`: 25 mục (Bài 4: 5, Bài 5: 5, Bài 6: 7, Bài 7: 8), tổng 52 câu ví dụ.
- `goldenTests.verbs`: 52, `goldenTests.adjectives`: 32, `particles`: 16, `quickGrammar`: 18, `selfCheck`: 8.
Sai lệch → báo ngay, không im lặng.

**Cách nạp:** biến tệp JSON thành `data/data.js` dạng `window.APP_DATA = {...};` để mở trực tiếp bằng `file://` vẫn chạy (không dùng `fetch` cho tệp local).

**Trang "Ghi chú về dữ liệu" (bắt buộc):** hiển thị `meta.sourceNote` và toàn bộ `sourceIssues` (các điểm sổ tay thiếu Furigana, thiếu từ trong danh sách, thiếu ví dụ…). Người học cần biết những chỗ này để đối chiếu với tài liệu lớp.

**Những thứ tệp KHÔNG có và bạn phải tự biên soạn (gắn `ai-authored`, `needsReview:true`):**
- Với mỗi mục ngữ pháp: `usage` (cách dùng, 2–4 ý), `commonMistakes` (lỗi người Việt hay mắc, ví dụ nhầm に/で, は/が, あります/います, 見ます/見ています), `exercises` (≥3 câu). Trường `todo` của mục ngữ pháp liệt kê đúng phần còn thiếu.
- Kanji: tệp không có On/Kun/số nét/Hán Việt. Xem mục 7B.

# 3. KIẾN TRÚC
Tách `index.html`, `css/`, `js/` (ES modules hoặc script thường), `data/data.js`. JavaScript thuần, không framework nặng. Font Noto Sans JP + Noto Sans qua Google Fonts kèm fallback hệ thống để vẫn chạy khi offline. Nếu tổng dung lượng chấp nhận được, có thể gộp một file HTML, nhưng ưu tiên cấu trúc tách vì dữ liệu ~170 KB.

Module riêng, tách biệt, có thể test độc lập: `furigana.js`, `tokenizer.js`, `verbEngine.js`, `adjEngine.js`, `patterns.js`, `srs.js`, `storage.js`, `exercises.js`, `validate.js`.

# 4. HỆ THỐNG FURIGANA
**Chuẩn duy nhất:** dữ liệu viết bằng markup `{漢字|かんじ}`; bộ render đổi thành `<ruby>漢字<rt>かんじ</rt></ruby>`. Dữ liệu trong tệp đã theo chuẩn này.
- Một hàm `renderJP(str)` dùng cho MỌI chuỗi tiếng Nhật hiển thị: nội dung, bảng, câu hỏi, đáp án, giải thích, tooltip, nút bấm, kết quả chia động từ, thông báo, nhãn sidebar.
- Cả chuỗi do công cụ sinh ra (dạng chia, bài tập) cũng phải qua markup: engine chia trên chuỗi markup và trả về markup.
- `validateFurigana()`: quét mọi chuỗi hiển thị, báo lỗi nếu còn Kanji ngoài `{|}` (regex `[\u4E00-\u9FFF々]`). Chạy lúc load, in kết quả ra console, hiện số lỗi trong trang "Ghi chú dữ liệu". Mục tiêu: 0 lỗi.
- Công tắc **Hiện/ẩn Furigana** (mặc định: Hiện). Khi ẩn, hover/chạm vào chữ vẫn xem được cách đọc.
- CSS: `ruby { ruby-position: over; }`, `rt { font-size: .55em; }`, `line-height ≥ 2` cho đoạn có Furigana, font `"Noto Sans JP","Hiragino Sans","Yu Gothic","Meiryo",sans-serif`.
- Từ chỉ có Hiragana/Katakana: không thêm Furigana.

# 5. TOKENIZER + HOVER DICTIONARY
Không có MeCab ở phía client. Giải pháp: **tách từ lúc nạp dữ liệu bằng khớp chuỗi dài nhất (greedy longest-match) dựa trên chỉ mục dạng chia.**

**5.1. `formIndex`:** xây từ `vocab` (mọi `scope`). Khóa là chuỗi hiển thị **không Furigana** (cả bản Kanji và bản Hiragana), giá trị là `{id, form}`. Gồm:
- dạng từ điển, và mọi giá trị trong `forms` (masu, te, nai, ta, potential, tai, stem; tính từ: polite, neg, past, pastneg, te);
- động từ: các hậu tố cố định ghép trên `stem` (ます, ません, ました, ませんでした, ましょう, ませんか, ましょうか, たい, たいです, に行きます…) và trên thể て (ください, います, いました…): coi đây là `{từ gốc}` + `{chip ngữ pháp}`, tooltip của chip trỏ tới mục ngữ pháp tương ứng;
- `readings` / `variants` (家 = いえ/うち, 分 = ふん/ぷん, くらい/ぐらい);
- trợ từ trong `particles` (hiển thị thẻ trợ từ nhỏ, có ghi chú đọc: は→わ, を→お, へ→え).

**5.2.** Khi nạp, mỗi câu/đoạn tiếng Nhật được tách tự động thành `<span class="word" data-id data-form>`. Chuỗi không khớp được để nguyên và **bị liệt kê vào báo cáo `unmatchedTokens`** (console + trang Ghi chú dữ liệu). Cho phép ghi đè tay bằng `[[id|{漢字|かんじ}]]` khi tách sai hoặc nhập nhằng.

**5.3. Tooltip** hiển thị: từ + Furigana, romaji, nghĩa, loại từ (nhóm động từ / い・な), thể từ điển, thể て, thể ない, một ví dụ + dịch (lấy từ `grammar[*].examples` nếu có từ đó, hoặc ví dụ tự sinh gắn nhãn), nút 🔊, nút ⭐ yêu thích, nút "Xem chi tiết". Từ có `alt_meanings` hiện đủ các nghĩa kèm bài. Từ `scope` khác `study` có nhãn nhỏ "ngoài danh sách bài".
**5.4. Tương tác:** desktop hover (trễ 150 ms) + focus bằng Tab; mobile chạm để mở, chạm ra ngoài/Esc để đóng. Tự lật lên/xuống/trái/phải để không tràn màn hình; `role="tooltip"`, `aria-describedby`. 🔊 dùng `speechSynthesis` `lang="ja-JP"` (ưu tiên voice ja-JP), không hỗ trợ thì vô hiệu hóa nút và báo rõ. Từ chưa có: hiện "Chưa có trong từ điển" + nút "Thêm vào từ điển cá nhân".

# 6. CÔNG CỤ CHIA (độ chính xác là ưu tiên số 1)
Mỗi engine là module thuần JS, test được độc lập.

## 6A. Engine chia động từ
Đầu vào: động từ thể từ điển (chọn từ danh sách hoặc nhập Kanji/Hiragana). Đầu ra: bảng **ます / từ điển / て / ない / た / 可能 / たい** + gốc ます.
- Từ có trong dữ liệu → dùng đúng `verbGroup` trong tệp. Từ lạ → đoán nhóm bằng quy tắc, **hiển thị mức chắc chắn** và hỏi lại khi mơ hồ (かえる → 帰る nhóm 1 hay 変える nhóm 2?).
- Danh sách bẫy trong `goldenTests.traps`: nhóm 1 trông như nhóm 2 (帰る, 入る, 走る, 切る, 知る, 要る) và nhóm 2 dễ nhầm (見る, 着る, 寝る, 起きる, 出る, 食べる, 借りる). 切る đang được dùng thật ở Bài 7 (切ってください), phải làm nổi bật.
- Quy tắc bắt buộc:
  - Nhóm 1 て/た: `う・つ・る → って/った`; `む・ぶ・ぬ → んで/んだ`; `く → いて/いた`; `ぐ → いで/いだ`; `す → して/した`; **ngoại lệ 行く → 行って/行った**.
  - Nhóm 1 ない: đuôi sang hàng あ; **う → わ** (買う→買わない).
  - Nhóm 1 可能: hàng え + る. Nhóm 2: 〜られる (ghi chú: văn nói hay dùng 〜れる). する→できる; 来る→来られる(こられる).
  - Nhóm 2: bỏ る + て/ない/た/たい.
  - Nhóm 3: する→して/しない/した/したい; 来る: き(ます・て・た・たい) / こ(ない・られる) / く(る).
  - **ある → ない** (không phải あらない); ある và 分かる không có thể 可能 ở N5 (engine trả `null` và UI hiển thị "không dùng").
- **Giải thích từng bước** cho mỗi thể, ví dụ: "飲む → nhóm 1 → đuôi む → んで → 飲んで". Chế độ **"Tự thử trước"**: người học nhập đáp án, hệ thống chấm rồi mới hiện lời giải.
- Furigana đúng cho mọi dạng sau khi chia.
- **Bộ test:** dùng nguyên `goldenTests.verbs` (52 ca; mỗi ca có `expected.{masu,te,nai,ta,potential,tai}.{plain,reading}`; `expected_none` là các thể phải trả `null`). Bạn **không được tự viết lại đáp án kỳ vọng**. Chạy khi load, in "N/N pass" ra console; ca fail hiển thị trong trang Ghi chú dữ liệu.

## 6B. Engine chia tính từ (Bài 4)
Tính từ い: です / くないです / かったです / くなかったです / くて. Tính từ な: です / じゃないです / でした / じゃなかったです / で. Ngoại lệ **いい → よ** (よくないです, よかったです), **きれい là tính từ な**. Test bằng `goldenTests.adjectives` (32 ca). Có chế độ "Tự thử trước" và giải thích từng bước.

## 6C. Bộ tạo mẫu câu từ động từ (nối trực tiếp với ngữ pháp Bài 5–7)
Chọn một động từ → engine sinh và giải thích: Vました / Vませんでした (B5), Vたいです (B5), Vます-stem + に行きます (B5), Vませんか / Vましょう (B6), Vます-stem + ましょうか (B7), Vてください / Vています (B7), 〜方 (B7: 使い方, 作り方). Mỗi mẫu hiển thị công thức + kết quả + dịch tiếng Việt. Đáp án luôn do engine sinh, không gõ tay.

# 7. MODULE NỘI DUNG
## A. Từ vựng (chỉ `scope: study`, chia theo bài 4–7)
Danh sách theo bài; tìm kiếm (Kanji, Hiragana, romaji, tiếng Việt không dấu); lọc theo loại từ/bài/đã học/từ khó; Flashcard 2 mặt (phím ← → Space); đánh dấu từ khó; bộ ôn từ sai. Từ trùng nhiều bài (`lessons:[4,7]`) chỉ tính **một lần** vào "số từ đã học".

## B. Kanji
Danh sách Kanji lấy **tự động từ chữ Hán xuất hiện trong từ vựng `study`** (khoảng 175 chữ; không giả định tất cả thuộc N5 – gắn nhãn N5 chỉ khi chắc chắn, còn lại "ngoài N5 / chưa đối chiếu"). Với mỗi chữ chỉ hiển thị những gì có thể xác thực: các từ trong dữ liệu chứa chữ đó (kèm Furigana, nghĩa). On/Kun, số nét, Hán Việt: bạn có thể biên soạn cho các chữ chắc chắn, gắn `ai-authored`, `needsReview:true`; chữ nào không chắc thì ghi "Chưa có dữ liệu". **Thứ tự nét: không làm** (ghi "Chưa có dữ liệu nét viết"). Bài tập nhận diện Kanji: chọn cách đọc từ các từ trong dữ liệu.

## C. Ngữ pháp (25 mục từ `grammar`)
Mỗi mục đủ 8 phần: tên, công thức, giải thích Việt (từ tệp), cách dùng, ví dụ có Furigana + dịch (từ tệp), lỗi thường gặp, bài tập áp dụng, liên kết tới từ liên quan. Phần nào chưa có từ tệp thì bạn biên soạn theo quy tắc `ai-authored`. Có trang **Bảng ngữ pháp nhìn nhanh** (`quickGrammar`, 18 dòng) và trang **Trợ từ** (`particles`).

## D. Chia động từ & tính từ: xem mục 6.
## E. Chuyên đề THỂ て
Dùng `teForm.table` và `teForm.tips`. Luyện theo 3 bước: **(1) phân biệt nhóm → (2) chọn đuôi → (3) chia**, kèm ngoại lệ 行く, các động từ dễ sai, và mẫu theo sau (〜てください, 〜ています ở Bài 7). Ghi chú rõ rằng bảng gốc của sổ tay chưa có ví dụ cho ちます/ります/にます và chưa nêu 切る, 知る; app bổ sung các ví dụ này từ engine (nhãn "bổ sung").

# 8. HỆ THỐNG BÀI TẬP
10 dạng: (1) trắc nghiệm ABCD, (2) điền từ/điền trợ từ, (3) nối từ–nghĩa, (4) chọn cách chia đúng, (5) sắp xếp câu, (6) dịch Nhật→Việt, (7) dịch Việt→Nhật (chọn/ghép từ, không chấm tự luận bằng so khớp chuỗi), (8) nghe và chọn (speechSynthesis), (9) nhận diện Kanji, (10) Flashcard.
**Sinh câu hỏi từ dữ liệu (không gõ tay):**
- Điền trợ từ: lấy câu ví dụ trong `grammar[*].examples`, che một trợ từ thuộc `particles`. **Chỉ giữ câu mà đáp án duy nhất** (loại câu chấp nhận nhiều trợ từ như は/が); câu nghi ngờ bỏ qua.
- Sắp xếp câu: tách theo cụm từ từ chính ví dụ; thêm cụm gây nhiễu chỉ khi không tạo đáp án thứ hai.
- Chọn dạng chia / phân biệt nhóm / thể て: đáp án **do engine sinh**, đáp án nhiễu là lỗi thường gặp (行いて, 買あない, 食べって…).
- Trắc nghiệm nghĩa: đáp án nhiễu cùng `pos`, cùng bài; xáo trộn vị trí đáp án; không có hai đáp án cùng đúng.
- 8 câu `selfCheck` trong tệp là bộ câu mở đầu có đáp án mẫu, đưa vào mục "Tự kiểm tra".
Sau mỗi câu: đúng/sai, đáp án chuẩn, giải thích tiếng Việt, liên kết tới mục ngữ pháp/từ liên quan. Câu sai vào **Sổ lỗi sai** kèm tần suất và chủ đề.

# 9. ÔN TẬP THÔNG MINH (SRS)
Leitner 5 hộp (hoặc SM-2 đơn giản) cho từ vựng `study`, Kanji, dạng chia. Mỗi thẻ có `box`, `nextReview`, `lapses`. "Ôn hôm nay" gom thẻ đến hạn + từ khó + câu vừa sai. Dashboard: số thẻ đến hạn, streak, mục tiêu ngày do người dùng đặt.

# 10. KIỂM TRA & ĐÁNH GIÁ
Chế độ: theo từng bài (4, 5, 6, 7), tổng hợp Bài 4–7, từ vựng, ngữ pháp, chia động từ/tính từ, tổng hợp. Bộ đếm giờ tùy chọn (bật/tắt, đặt phút, hết giờ tự nộp). Sau bài: điểm, đúng/sai, tỷ lệ, **chủ đề yếu** (nhóm theo `topic`), danh sách câu sai kèm giải thích, đề xuất ôn kèm liên kết bấm được. Câu lấy ngẫu nhiên theo chủ đề, không lặp trong một đề.

# 11. DASHBOARD, CÁ NHÂN HÓA, LƯU TRỮ
Dashboard: trình độ, số từ/Kanji đã học (chỉ `study`), tỷ lệ đúng, tiến độ từng bài **4–7** (thanh %), nội dung cần ôn, lịch sử 7/30 ngày, streak.
Sidebar 10 mục: Tổng quan, Lộ trình học (4 bài), Từ vựng, Kanji, Ngữ pháp, Chia động từ & tính từ, Luyện tập, Kiểm tra, Từ điển cá nhân, **Ghi chú dữ liệu**. Mobile: menu dưới hoặc drawer.
`localStorage` với khóa có tiền tố + `schemaVersion`, bọc `try/catch` (nếu bị chặn: báo người dùng và chạy trong bộ nhớ). Lưu: từ đã học, yêu thích, từ khó, câu sai, kết quả kiểm tra, SRS, cài đặt (Furigana, cỡ chữ, sáng/tối). Nút **Đặt lại** (hỏi xác nhận), **Xuất/Nhập JSON** (kiểm tra định dạng và phiên bản trước khi nhập, không ghi đè mù quáng).

# 12. GIAO DIỆN & TRUY CẬP
Hiện đại, tối giản, nền sáng, chủ đạo xanh lá hoặc xanh dương, có chế độ tối. Responsive 360px → desktop. Vùng chạm ≥ 44 px. Điều khiển bằng bàn phím, focus rõ, tương phản WCAG AA, `lang="ja"` cho đoạn tiếng Nhật và `lang="vi"` cho tiếng Việt. Có trạng thái rỗng, đang tải, lỗi.

# 13. QUY TRÌNH LÀM VIỆC (để không bị cắt giữa chừng)
Làm theo giai đoạn; mỗi giai đoạn chạy được độc lập, kết thúc bằng bản tự kiểm tra và dừng chờ tôi gõ "tiếp tục".
- **Giai đoạn 1 – Lõi:** khung giao diện, nạp `data.js` + kiểm tra số liệu, `renderJP`, `validateFurigana`, tokenizer + Hover Dictionary, lưu trữ, trang Ghi chú dữ liệu, Từ vựng + Flashcard, Ngữ pháp (hiển thị dữ liệu có sẵn).
- **Giai đoạn 2 – Chia động từ/tính từ:** engine 6A–6C, giải thích từng bước, chạy `goldenTests`, chuyên đề thể て.
- **Giai đoạn 3 – Luyện tập & Kiểm tra:** 10 dạng bài, sổ lỗi sai, chế độ kiểm tra, báo cáo.
- **Giai đoạn 4 – SRS, Kanji, Từ điển cá nhân, Xuất/Nhập JSON, biên soạn phần `ai-authored` còn thiếu.**

# 14. TIÊU CHÍ NGHIỆM THU
Trước khi báo hoàn thành mỗi giai đoạn, **báo cáo từng mục: đạt/không đạt + bằng chứng cụ thể** (số liệu in từ console, không chỉ nói "đã kiểm tra"):
- [ ] Số liệu nạp khớp mục 2 (225 / 173 / 34 / 17 / 1; 25 ngữ pháp; 52 ví dụ).
- [ ] `validateFurigana()` = 0 lỗi.
- [ ] `unmatchedTokens` đã được liệt kê; mọi từ vựng trong ví dụ ngữ pháp đều tra được.
- [ ] Hover (desktop) và chạm (mobile) mở đúng tooltip, không tràn màn hình.
- [ ] `goldenTests.verbs` 52/52 và `goldenTests.adjectives` 32/32 pass.
- [ ] Không có Bài 3 ở bất kỳ đâu trong giao diện; từ `extra/foundation/engine` không bị tính vào tiến độ.
- [ ] Mỗi loại bài tập chấm đúng ≥ 1 ca đúng và ≥ 1 ca sai; câu trợ từ có đáp án duy nhất.
- [ ] Tải lại trang vẫn giữ tiến độ; Xuất rồi Nhập JSON khôi phục đúng.
- [ ] Không nút vô tác dụng; không lỗi Console.
- [ ] Dùng được ở 360 px, 768 px, 1280 px.
- [ ] Mọi nội dung `ai-authored` đều có nhãn và `needsReview:true`.
Cuối mỗi giai đoạn liệt kê: **chưa làm gì, có thể sai ở đâu, tôi cần cung cấp thêm dữ liệu gì** (ví dụ tài liệu lớp để đối chiếu từ vựng từng bài).

# MỤC TIÊU CUỐI
Một công cụ tự học cho Bài 4–7: hiểu bài, nhớ từ lâu, tự chia động từ/tính từ đúng kèm lời giải, tra ngay khi gặp từ mới, và ôn đúng thứ cần ôn mỗi ngày, với dữ liệu minh bạch về chỗ nào đến từ sổ tay và chỗ nào do AI soạn.
