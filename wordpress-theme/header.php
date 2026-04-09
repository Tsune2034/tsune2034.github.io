<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo( 'charset' ); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>

  <header class="site-header">
    <div class="header-inner">
      <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="site-logo">
        <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/logo.png" alt="KAIROX" height="40">
      </a>
      <nav class="site-nav" id="site-nav">
        <ul>
          <li><a href="<?php echo esc_url( home_url( '/' ) ); ?>">ホーム</a></li>
          <li><a href="<?php echo esc_url( home_url( '/service/' ) ); ?>">サービス</a></li>
          <li><a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">会社概要</a></li>
          <li><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" class="nav-cta">予約する</a></li>
        </ul>
      </nav>
      <button class="hamburger" id="hamburger" aria-label="メニュー">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </header>
