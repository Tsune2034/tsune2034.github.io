<?php get_header(); ?>

  <!-- ページヒーロー -->
  <section class="page-hero">
    <h1>会社概要</h1>
    <p>KAIROXについて</p>
  </section>

  <!-- ミッション -->
  <section class="section">
    <div class="section-inner">
      <div class="about-grid">
        <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/about.jpg" alt="KAIROXのミッション">
        <div class="about-text">
          <h2>訪日旅行者の<br>時間を解放する</h2>
          <p>KAIROXは「Japan Luggage Freedom」をコンセプトに、訪日外国人旅行者が成田空港到着後すぐに手ぶらで観光できるサービスを提供しています。</p>
          <p>コインロッカーは満杯、ヤマト手ぶら観光は翌日着——その隙間を埋めるために、KAIROXは「当日・リアルタイム追跡・多言語」を武器に生まれました。</p>
          <p>「着いた日から、全力で遊べ。」という言葉の通り、荷物の心配をゼロにして、日本の旅をより豊かにします。</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 会社情報 -->
  <section class="section section-bg">
    <div class="section-inner">
      <h2 class="section-title">会社情報</h2>
      <p class="section-subtitle">Company Information</p>
      <table class="info-table" style="max-width:700px; margin:0 auto;">
        <tr>
          <th>会社名</th>
          <td>KAIROX</td>
        </tr>
        <tr>
          <th>設立</th>
          <td>2026年</td>
        </tr>
        <tr>
          <th>代表者</th>
          <td>Daisuke Tsunemori</td>
        </tr>
        <tr>
          <th>事業内容</th>
          <td>訪日外国人向け手ぶら荷物配送サービス</td>
        </tr>
        <tr>
          <th>対応エリア</th>
          <td>成田国際空港 第1・第2・第3ターミナル</td>
        </tr>
        <tr>
          <th>対応言語</th>
          <td>日本語・English・中文・한국어</td>
        </tr>
        <tr>
          <th>ウェブサイト</th>
          <td>https://kairox.jp</td>
        </tr>
        <tr>
          <th>お問い合わせ</th>
          <td><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" style="color:#1565C0;">お問い合わせフォーム</a></td>
        </tr>
      </table>
    </div>
  </section>

  <!-- 特徴 -->
  <section class="section">
    <div class="section-inner">
      <h2 class="section-title">私たちの強み</h2>
      <p class="section-subtitle">他社との違い</p>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>当日配達</h3>
          <p>到着当日にホテルまでお届け。翌日着のサービスとは違い、すぐに手ぶら観光を楽しめます。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>安心・安全</h3>
          <p>受け渡し時の証跡写真撮影、リアルタイムGPS追跡で荷物の状況を常に把握できます。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💬</div>
          <h3>4言語サポート</h3>
          <p>英語・日本語・中国語・韓国語対応。外国人旅行者が安心して使えるサービスを目指します。</p>
        </div>
      </div>
    </div>
  </section>

<?php get_footer(); ?>
