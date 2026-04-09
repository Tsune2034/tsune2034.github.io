<?php get_header(); ?>

  <!-- ヒーローセクション -->
  <section class="hero">
    <div class="hero-inner">
      <h1>着いた日から、<br>全力で遊べ。</h1>
      <p>成田空港からホテルまで、荷物はKAIROXがお届け。<br>あなたは手ぶらで、日本を楽しんでください。</p>
      <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" class="btn-primary">今すぐ予約する</a>
      <a href="https://kairox.jp/narita" class="btn-secondary" style="margin-left:16px;">公式予約ページへ</a>
    </div>
  </section>

  <!-- 特徴セクション -->
  <section class="section section-bg">
    <div class="section-inner">
      <h2 class="section-title">KAIROXが選ばれる理由</h2>
      <p class="section-subtitle">Japan Luggage Freedom — 訪日旅行者のための手ぶら配送サービス</p>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🚗</div>
          <h3>当日配達</h3>
          <p>空港到着後、その日のうちにホテルへお届け。翌日待ちのヤマトとは違います。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📍</div>
          <h3>リアルタイム追跡</h3>
          <p>GPSでドライバーの位置をリアルタイムに確認。荷物の今がわかります。</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🌏</div>
          <h3>4言語対応</h3>
          <p>英語・日本語・中国語・韓国語に対応。言語の壁なく安心してご利用いただけます。</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ご利用の流れ -->
  <section class="section">
    <div class="section-inner">
      <h2 class="section-title">ご利用の流れ</h2>
      <p class="section-subtitle">3ステップで簡単予約</p>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <h3>オンライン予約</h3>
          <p>フライト情報とホテルを入力して予約完了。最短5分。</p>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <h3>空港で引き渡し</h3>
          <p>到着ターミナルでドライバーに荷物をお渡しください。</p>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <h3>ホテルに届く</h3>
          <p>あなたが観光を楽しんでいる間に、荷物がホテルに届きます。</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTAバナー -->
  <section class="cta-banner">
    <div class="section-inner">
      <h2>荷物は、お迎えに上がります。</h2>
      <p>成田空港対応 / 当日配達 / 多言語サポート</p>
      <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" class="btn-primary">予約はこちら</a>
    </div>
  </section>

<?php get_footer(); ?>
