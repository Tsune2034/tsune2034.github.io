  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="site-logo">
          <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/logo.png" alt="KAIROX" height="36" style="filter: brightness(0) invert(1);">
        </div>
        <p>Japan Luggage Freedom<br>訪日旅行者のための手ぶら配送サービス</p>
      </div>
      <div class="footer-col">
        <h4>メニュー</h4>
        <ul>
          <li><a href="<?php echo esc_url( home_url( '/' ) ); ?>">ホーム</a></li>
          <li><a href="<?php echo esc_url( home_url( '/service/' ) ); ?>">サービス</a></li>
          <li><a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">会社概要</a></li>
          <li><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">お問い合わせ</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>サービスエリア</h4>
        <ul>
          <li><a href="#">成田空港 第1ターミナル</a></li>
          <li><a href="#">成田空港 第2ターミナル</a></li>
          <li><a href="#">成田空港 第3ターミナル</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; <?php echo date( 'Y' ); ?> KAIROX. All rights reserved.</p>
    </div>
  </footer>

  <script>
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('site-nav');
    hamburger.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  </script>

  <?php wp_footer(); ?>
</body>
</html>
