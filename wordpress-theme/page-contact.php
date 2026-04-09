<?php get_header(); ?>

  <!-- ページヒーロー -->
  <section class="page-hero">
    <h1>お問い合わせ・予約</h1>
    <p>ご予約・ご質問はこちらから</p>
  </section>

  <!-- コンタクトフォーム -->
  <section class="section section-bg">
    <div class="section-inner">
      <div class="contact-form">
        <h2 class="section-title" style="margin-bottom:8px;">予約フォーム</h2>
        <p class="section-subtitle" style="margin-bottom:32px;">お届け情報をご入力ください</p>

        <form id="contact-form" method="post" action="">
          <?php wp_nonce_field( 'kairox_contact', 'kairox_nonce' ); ?>

          <div class="form-group">
            <label for="name">お名前<span>*</span></label>
            <input type="text" id="name" name="name" placeholder="Taro Yamada" required>
          </div>

          <div class="form-group">
            <label for="email">メールアドレス<span>*</span></label>
            <input type="email" id="email" name="email" placeholder="example@email.com" required>
          </div>

          <div class="form-group">
            <label for="flight">フライト番号<span>*</span></label>
            <input type="text" id="flight" name="flight" placeholder="例：JL001">
          </div>

          <div class="form-group">
            <label for="arrival">到着日時<span>*</span></label>
            <input type="datetime-local" id="arrival" name="arrival" required>
          </div>

          <div class="form-group">
            <label for="hotel">宿泊先ホテル名<span>*</span></label>
            <input type="text" id="hotel" name="hotel" placeholder="例：新宿プリンスホテル" required>
          </div>

          <div class="form-group">
            <label for="luggage">荷物の種類・個数<span>*</span></label>
            <select id="luggage" name="luggage">
              <option value="">選択してください</option>
              <option value="s">スーツケース S/M × 1個</option>
              <option value="l">スーツケース L/XL × 1個</option>
              <option value="2s">スーツケース S/M × 2個</option>
              <option value="2l">スーツケース L/XL × 2個</option>
              <option value="other">その他（備考欄に記入）</option>
            </select>
          </div>

          <div class="form-group">
            <label for="message">備考・ご質問</label>
            <textarea id="message" name="message" placeholder="特記事項があればご記入ください"></textarea>
          </div>

          <button type="submit" class="form-submit">予約を送信する</button>
        </form>
      </div>
    </div>
  </section>

  <script>
    document.getElementById('contact-form').addEventListener('submit', function(e) {
      e.preventDefault();
      alert('予約を受け付けました。確認メールをお送りします。');
    });
  </script>

<?php get_footer(); ?>
