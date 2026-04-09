<?php
function kairox_theme_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    register_nav_menus( array(
        'primary' => 'Primary Menu',
    ) );
}
add_action( 'after_setup_theme', 'kairox_theme_setup' );

function kairox_enqueue_scripts() {
    wp_enqueue_style( 'kairox-style', get_stylesheet_uri(), array(), '1.0.0' );
}
add_action( 'wp_enqueue_scripts', 'kairox_enqueue_scripts' );
