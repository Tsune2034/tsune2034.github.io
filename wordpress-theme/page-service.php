<?php get_header(); ?>

  <!-- ページヒーロー -->
  <section class="page-hero">
    <h1>サービス紹介</h1>
    <p>KAIROXの手ぶら配送サービス詳細</p>
  </section>

  <!-- サービス一覧 -->
  <section class="section section-bg">
    <div class="section-inner">
      <h2 class="section-title">提供サービス</h2>
      <p class="section-subtitle">成田空港からホテルまで、安心・迅速にお届けします</p>
      <div class="service-list">
        <div class="service-item">
          <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/service1.jpg" alt="空港から当日配達">
          <div class="service-item-body">
            <h3>空港 → ホテル 当日配達</h3>
            <p>成田空港到着後、その日のうちにホテルへお届け。フライト情報を事前に共有いただければ、ドライバーが空港で待機します。大型スーツケースも対応可能です。</p>
            <span class="price-tag">¥9,500〜 / 個</span>
          </div>
        </div>
        <div class="service-item">
          <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/service2.jpg" alt="リアルタイム追跡">
          <div class="service-item-body">
            <h3>リアルタイムGPS追跡</h3>
            <p>専用URLから荷物の現在地をリアルタイムで確認できます。ドライバーの位置情報が地図上に表示されるので、いつ届くか一目でわかります。</p>
            <span class="price-tag">無料（標準機能）</span>
          </div>
        </div>
        <div class="service-item">
          <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/service3.jpg" alt="多言語サポート">
          <div class="service-item-body">
            <h3>多言語カスタマーサポート</h3>
            <p>英語・日本語・中国語・韓国語の4言語でサポート対応。チャットまたは電話でいつでもご連絡いただけます。</p>
            <span class="price-tag">無料（標準機能）</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 料金表 -->
  <section class="section">
    <div class="section-inner">
      <h2 class="section-title">料金案内</h2>
      <p class="section-subtitle">シンプルな料金体系</p>
      <table class="info-table" style="max-width:600px; margin:0 auto;">
        <tr>
          <th>スーツケース（S/M）</th>
          <td>¥9,500 / 個</td>
        </tr>
        <tr>
          <th>スーツケース（L/XL）</th>
          <td>¥12,000 / 個</td>
        </tr>
        <tr>
          <th>ボストンバッグ</th>
          <td>¥8,000 / 個</td>
        </tr>
        <tr>
          <th>追加荷物</th>
          <td>¥4,000 / 個〜</td>
        </tr>
        <tr>
          <th>時間指定</th>
          <td>無料</td>
        </tr>
        <tr>
          <th>キャンセル（24時間前まで）</th>
          <td>無料</td>
        </tr>
      </table>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta-banner">
    <div class="section-inner">
      <h2>今すぐ予約する</h2>
      <p>オンライン予約完了まで最短5分</p>
      <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" class="btn-primary">予約フォームへ</a>
    </div>
  </section>

<?php get_footer(); ?>
