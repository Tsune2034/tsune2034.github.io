<?php get_header(); ?>

  <section class="page-hero">
    <h1><?php the_title(); ?></h1>
  </section>

  <section class="section">
    <div class="section-inner">
      <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
        <?php the_content(); ?>
      <?php endwhile; endif; ?>
    </div>
  </section>

<?php get_footer(); ?>
