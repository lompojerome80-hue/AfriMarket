from pathlib import Path

files = {
    'index.html': '''<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="AfriMarket - Le marché du Burkina Faso pour les produits locaux et artisanaux.">
    <meta property="og:title" content="AfriMarket - Le marché du Burkina Faso" />
    <meta property="og:description" content="Découvrez les meilleurs produits locaux, mode et artisanat du Burkina Faso." />
    <meta property="og:image" content="photos/logo-afrimarket-white.svg" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;500;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css" />
    <link rel="stylesheet" href="css/style.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css" />
    <title>AfriMarket - Le marché du Burkina Faso</title>
</head>

<body>
    <header>
        <a class="brand" href="index.html">
            <img src="photos/logo-afrimarket.svg" alt="Logo AfriMarket" />
            <span>AfriMarket</span>
        </a>
        <div class="search" id="searchIcon">
            <input type="text" id="searchInput" placeholder="Rechercher un produit, une marque ou une catégorie..." />
        </div>
        <nav class="nav-menu" id="menu">
            <button class="navCloseBtn" aria-label="Fermer le menu"><i class="uil uil-times"></i></button>
            <ul>
                <li><a href="index.html">Accueil</a></li>
                <li><a href="products.html">Produits</a></li>
                <li><a href="contact.html">Contact</a></li>
                <li><a href="panier.html">Panier</a></li>
                <li><img src="photos/icon-bf-flag.svg" alt="Drapeau Burkina Faso" class="flag-icon" /></li>
                <li class="currency">FCFA</li>
            </ul>
        </nav>
        <button class="navOpenBtn" id="navOpenBtn" aria-label="Ouvrir le menu"><i class="uil uil-bars"></i></button>
    </header>

    <div class="sidebar" id="sidebar">
        <div class="cart-header">
            <div>
                <span>Mon panier</span>
                <strong>3 articles</strong>
            </div>
            <button class="close-btn" id="closeSidebarBtn" aria-label="Fermer le panier"><i class="uil uil-times"></i></button>
        </div>
        <div class="cart-content">
            <ul class="pro-list">
                <li class="pro-item">
                    <div class="pro-info">
                        <img src="photos/picc1.jpeg" alt="Sac artisanal burkinabè" />
                        <div class="pro-details">
                            <span class="pro-name">Sac en pagne tissé</span>
                            <span class="pro-payment-method">Orange Money</span>
                            <p class="pro-price" id="appliedCount1">12 000 FCFA</p>
                        </div>
                    </div>
                    <div class="pro-actions">
                        <div class="pro-icons">
                            <img src="photos/heart.png" alt="Ajouter aux favoris" />
                            <img src="photos/ic_outline-delete.png" alt="Supprimer du panier" class="remove-pro" />
                        </div>
                        <div class="count-pro">
                            <div class="count" data-product="1">-</div>
                            <span id="countValue1" data-product="1">1</span>
                            <div class="count-2" data-product="1">+</div>
                        </div>
                    </div>
                </li>
                <li class="pro-item">
                    <div class="pro-info">
                        <img src="photos/picc2.jpeg" alt="Sandales artisanales" />
                        <div class="pro-details">
                            <span class="pro-name">Sandales artisanales</span>
                            <span class="pro-payment-method">Carte bancaire</span>
                            <p class="pro-price" id="appliedCount2">8 900 FCFA</p>
                        </div>
                    </div>
                    <div class="pro-actions">
                        <div class="pro-icons">
                            <img src="photos/heart.png" alt="Ajouter aux favoris" />
                            <img src="photos/ic_outline-delete.png" alt="Supprimer du panier" class="remove-pro" />
                        </div>
                        <div class="count-pro">
                            <div class="count" data-product="2">-</div>
                            <span id="countValue2" data-product="2">1</span>
                            <div class="count-2" data-product="2">+</div>
                        </div>
                    </div>
                </li>
                <li class="pro-item">
                    <div class="pro-info">
                        <img src="photos/picc3.jpeg" alt="Huile de karité" />
                        <div class="pro-details">
                            <span class="pro-name">Huile de karité pure</span>
                            <span class="pro-payment-method">Moov Money</span>
                            <p class="pro-price" id="appliedCount3">6 500 FCFA</p>
                        </div>
                    </div>
                    <div class="pro-actions">
                        <div class="pro-icons">
                            <img src="photos/heart.png" alt="Ajouter aux favoris" />
                            <img src="photos/ic_outline-delete.png" alt="Supprimer du panier" class="remove-pro" />
                        </div>
                        <div class="count-pro">
                            <div class="count" data-product="3">-</div>
                            <span id="countValue3" data-product="3">1</span>
                            <div class="count-2" data-product="3">+</div>
                        </div>
                    </div>
                </li>
            </ul>
            <div class="cart-summary">
                <div><span>Total</span><strong id="total">27 400 FCFA</strong></div>
                <a href="panier.html" class="button primary">Voir le panier</a>
            </div>
        </div>
    </div>

    <div id="overlay"></div>

    <main>
        <section class="hero">
            <div class="hero-copy">
                <span class="eyebrow">Bienvenue au marché du Faso</span>
                <h1>AfriMarket, votre plateforme e-commerce burkinabè.</h1>
                <p>Découvrez des produits locaux, de l'artisanat traditionnel et les meilleures offres en FCFA.</p>
                <div class="hero-actions">
                    <a href="products.html" class="button primary">Voir les produits</a>
                    <a href="#categories" class="button secondary">Explorer les catégories</a>
                </div>
                <div class="hero-features">
                    <span><strong>Livraison</strong> Ouagadougou, Bobo-Dioulasso, Koudougou</span>
                    <span><strong>Paiements</strong> Orange Money, Moov Money, Wave, carte bancaire</span>
                </div>
            </div>
            <div class="hero-visual">
                <img src="photos/hero-burkina.svg" alt="Marché du Burkina Faso" />
            </div>
        </section>

        <section class="highlight-cards" id="categories">
            <article>
                <span>Catégories populaires</span>
                <h2>Retrouvez les meilleurs produits locaux.</h2>
            </article>
            <div class="cards-grid">
                <a href="products.html" class="category-card">
                    <img src="photos/category-fashion.svg" alt="Mode" />
                    <strong>Mode</strong>
                </a>
                <a href="products.html" class="category-card">
                    <img src="photos/category-telecom.svg" alt="Téléphones" />
                    <strong>Téléphones</strong>
                </a>
                <a href="products.html" class="category-card">
                    <img src="photos/category-electronics.svg" alt="Électronique" />
                    <strong>Électronique</strong>
                </a>
                <a href="products.html" class="category-card">
                    <img src="photos/category-artisanat.svg" alt="Artisanat" />
                    <strong>Artisanat</strong>
                </a>
            </div>
        </section>

        <section class="products-type">
            <button id="clickToShowList">Toutes les catégories</button>
            <ul id="accessoriesList">
                <li><a class="category-link" href="products.html">Mode</a></li>
                <li><a class="category-link" href="products.html">Téléphones</a></li>
                <li><a class="category-link" href="products.html">Électronique</a></li>
                <li><a class="category-link" href="products.html">Informatique</a></li>
                <li><a class="category-link" href="products.html">Beauté</a></li>
                <li><a class="category-link" href="products.html">Maison</a></li>
                <li><a class="category-link" href="products.html">Artisanat</a></li>
                <li><a class="category-link" href="products.html">Agriculture</a></li>
            </ul>
            <div class="swiper-container-wrapper">
                <swiper-container class="mySwiper" pagination="true" pagination-clickable="true" navigation="true" space-between="24" centered-slides="true" autoplay-delay="2800" autoplay-disable-on-interaction="false">
                    <swiper-slide><img class="pic-slide" src="photos/ac1.jpeg" alt="Marché" /></swiper-slide>
                    <swiper-slide><img class="pic-slide" src="photos/ac2.jpeg" alt="Artisans" /></swiper-slide>
                    <swiper-slide><img class="pic-slide" src="photos/ac3.jpeg" alt="Produits locaux" /></swiper-slide>
                    <swiper-slide><img class="pic-slide" src="photos/ac4.jpeg" alt="Commerce" /></swiper-slide>
                    <swiper-slide><img class="pic-slide" src="photos/ac5.jpeg" alt="Vendeurs" /></swiper-slide>
                </swiper-container>
            </div>
        </section>

        <section class="featured-products">
            <div class="section-header">
                <h2>#Produits Vedettes</h2>
                <p>Des sélections de qualité pour le marché burkinabè.</p>
            </div>
            <div class="list-products">
                <article class="info-product">
                    <div class="product">
                        <img src="photos/picc1.jpeg" alt="Hamac artisanal" />
                    </div>
                    <div class="desc">
                        <span>9 500 FCFA</span>
                        <span class="chiffre">12 000 FCFA<div class="drop-price"></div></span>
                        <p class="desc-text">Hamac artisanal tissé</p>
                        <p class="desc-text">Confort et style authentique.</p>
                        <div class="star-content">
                            <div class="star"><img src="photos/Star.png" alt="étoile" /><span>4,9</span></div>
                            <div class="content-product"><span class="sold">vendu</span><a href="#"><img class="add-pro" src="photos/Shopping Mall.png" alt="ajouter au panier" /></a></div>
                        </div>
                    </div>
                </article>
                <article class="info-product">
                    <div class="product">
                        <img src="photos/picc2.jpeg" alt="Sandales" />
                    </div>
                    <div class="desc">
                        <span>7 200 FCFA</span>
                        <span class="chiffre">9 800 FCFA<div class="drop-price"></div></span>
                        <p class="desc-text">Sandales artisanales en cuir</p>
                        <p class="desc-text">Production locale, finition premium.</p>
                        <div class="star-content">
                            <div class="star"><img src="photos/Star.png" alt="étoile" /><span>4,8</span></div>
                            <div class="content-product"><span class="sold">vendu</span><a href="#"><img class="add-pro" src="photos/Shopping Mall.png" alt="ajouter au panier" /></a></div>
                        </div>
                    </div>
                </article>
                <article class="info-product">
                    <div class="product">
                        <img src="photos/picc3.jpeg" alt="Huile de karité" />
                    </div>
                    <div class="desc">
                        <span>5 900 FCFA</span>
                        <span class="chiffre">8 200 FCFA<div class="drop-price"></div></span>
                        <p class="desc-text">Huile de karité premium</p>
                        <p class="desc-text">Soins naturels du marché burkinabè.</p>
                        <div class="star-content">
                            <div class="star"><img src="photos/Star.png" alt="étoile" /><span>4,9</span></div>
                            <div class="content-product"><span class="sold">vendu</span><a href="#"><img class="add-pro" src="photos/Shopping Mall.png" alt="ajouter au panier" /></a></div>
                        </div>
                    </div>
                </article>
                <article class="info-product">
                    <div class="product">
                        <img src="photos/picc4.jpeg" alt="Bijoux artisanaux" />
                    </div>
                    <div class="desc">
                        <span>13 500 FCFA</span>
                        <span class="chiffre">17 500 FCFA<div class="drop-price"></div></span>
                        <p class="desc-text">Bijoux artisanaux en bronze</p>
                        <p class="desc-text">Créations authentiques du Sahel.</p>
                        <div class="star-content">
                            <div class="star"><img src="photos/Star.png" alt="étoile" /><span>4,7</span></div>
                            <div class="content-product"><span class="sold">vendu</span><a href="#"><img class="add-pro" src="photos/Shopping Mall.png" alt="ajouter au panier" /></a></div>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <section class="feature-showcase">
            <div class="section-header">
                <h2>Pourquoi choisir AfriMarket ?</h2>
                <p>Une expérience de commerce digital locale, transparente et sécurisée.</p>
            </div>
            <div class="showcase-grid">
                <article>
                    <h3>Produits authentiques</h3>
                    <p>Articles sélectionnés chez les artisans et commerçants burkinabè.</p>
                </article>
                <article>
                    <h3>Paiement FCFA</h3>
                    <p>Orange Money, Moov Money, Wave et carte bancaire.</p>
                </article>
                <article>
                    <h3>Livraison rapide</h3>
                    <p>Service national disponible dans tout le Burkina Faso.</p>
                </article>
                <article>
                    <h3>Qualité premium</h3>
                    <p>Interface moderne, navigation fluide et confiance locale.</p>
                </article>
            </div>
        </section>
    </main>

    <footer>
        <div class="footer-grid">
            <div>
                <h3>AfriMarket</h3>
                <p>Votre marché en ligne du Burkina Faso pour l'artisanat, la mode et l'électronique.</p>
            </div>
            <div>
                <h4>Liens rapides</h4>
                <ul>
                    <li><a href="index.html">Accueil</a></li>
                    <li><a href="products.html">Produits</a></li>
                    <li><a href="contact.html">Contact</a></li>
                    <li><a href="panier.html">Panier</a></li>
                </ul>
            </div>
            <div>
                <h4>Assistance</h4>
                <ul>
                    <li><a href="#">Aide</a></li>
                    <li><a href="#">Support</a></li>
                    <li><a href="#">FAQ</a></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <span>© 2026 AfriMarket</span>
            <span>Livraison disponible partout au Burkina Faso</span>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/swiper@10/swiper-element-bundle.min.js"></script>
    <script src="script.js"></script>
</body>

</html>
''',
    'products.html': '''<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Catalogue des produits AfriMarket : mode, artisanat, électronique et bien-être burkinabè." />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;500;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css" />
    <link rel="stylesheet" href="css/style.css" />
    <title>Produits | AfriMarket</title>
</head>

<body>
    <header>
        <a class="brand" href="index.html">
            <img src="photos/logo-afrimarket.svg" alt="Logo AfriMarket" />
            <span>AfriMarket</span>
        </a>
        <div class="search" id="searchIcon">
            <input type="text" placeholder="Rechercher un produit, une marque ou une catégorie..." />
        </div>
        <nav class="nav-menu" id="menu">
            <button class="navCloseBtn" aria-label="Fermer le menu"><i class="uil uil-times"></i></button>
            <ul>
                <li><a href="index.html">Accueil</a></li>
                <li><a href="products.html">Produits</a></li>
                <li><a href="contact.html">Contact</a></li>
                <li><a href="panier.html">Panier</a></li>
                <li><img src="photos/icon-bf-flag.svg" alt="Drapeau Burkina Faso" class="flag-icon" /></li>
                <li class="currency">FCFA</li>
            </ul>
        </nav>
        <button class="navOpenBtn" id="navOpenBtn" aria-label="Ouvrir le menu"><i class="uil uil-bars"></i></button>
    </header>

    <div class="sidebar" id="sidebar">
        <div class="cart-header">
            <div>
                <span>Mon panier</span>
                <strong>3 articles</strong>
            </div>
            <button class="close-btn" id="closeSidebarBtn" aria-label="Fermer le panier"><i class="uil uil-times"></i></button>
        </div>
        <div class="cart-content">
            <ul class="pro-list">
                <li class="pro-item">
                    <div class="pro-info">
                        <img src="photos/picc1.jpeg" alt="Sac artisanal" />
                        <div class="pro-details">
                            <span class="pro-name">Sac en pagne</span>
                            <span class="pro-payment-method">Orange Money</span>
                            <p class="pro-price" id="appliedCount1">12 000 FCFA</p>
                        </div>
                    </div>
                    <div class="pro-actions">
                        <div class="pro-icons">
                            <img src="photos/heart.png" alt="Ajouter aux favoris" />
                            <img src="photos/ic_outline-delete.png" alt="Supprimer du panier" class="remove-pro" />
                        </div>
                        <div class="count-pro">
                            <div class="count" data-product="1">-</div>
                            <span id="countValue1" data-product="1">1</span>
                            <div class="count-2" data-product="1">+</div>
                        </div>
                    </div>
                </li>
                <li class="pro-item">
                    <div class="pro-info">
                        <img src="photos/picc2.jpeg" alt="Sandales artisanales" />
                        <div class="pro-details">
                            <span class="pro-name">Sandales artisanales</span>
                            <span class="pro-payment-method">Carte bancaire</span>
                            <p class="pro-price" id="appliedCount2">8 900 FCFA</p>
                        </div>
                    </div>
                    <div class="pro-actions">
                        <div class="pro-icons">
                            <img src="photos/heart.png" alt="Ajouter aux favoris" />
                            <img src="photos/ic_outline-delete.png" alt="Supprimer du panier" class="remove-pro" />
                        </div>
                        <div class="count-pro">
                            <div class="count" data-product="2">-</div>
                            <span id="countValue2" data-product="2">1</span>
                            <div class="count-2" data-product="2">+</div>
                        </div>
                    </div>
                </li>
                <li class="pro-item">
                    <div class="pro-info">
                        <img src="photos/picc3.jpeg" alt="Huile de karité" />
                        <div class="pro-details">
                            <span class="pro-name">Huile de karité pure</span>
                            <span class="pro-payment-method">Moov Money</span>
                            <p class="pro-price" id="appliedCount3">6 500 FCFA</p>
                        </div>
                    </div>
                    <div class="pro-actions">
                        <div class="pro-icons">
                            <img src="photos/heart.png" alt="Ajouter aux favoris" />
                            <img src="photos/ic_outline-delete.png" alt="Supprimer du panier" class="remove-pro" />
                        </div>
                        <div class="count-pro">
                            <div class="count" data-product="3">-</div>
                            <span id="countValue3" data-product="3">1</span>
                            <div class="count-2" data-product="3">+</div>
                        </div>
                    </div>
                </li>
            </ul>
            <div class="cart-summary">
                <div><span>Total</span><strong id="total">27 400 FCFA</strong></div>
                <a href="panier.html" class="button primary">Voir le panier</a>
            </div>
        </div>
    </div>

    <div id="overlay"></div>

    <main>
        <section class="hero">
            <div class="hero-copy">
                <span class="eyebrow">Boutique</span>
                <h1>Découvrez nos meilleures catégories locales.</h1>
                <p>Une sélection qui valorise l'artisanat, la mode et l'électronique du Burkina Faso.</p>
            </div>
        </section>

        <section class="featured-products">
            <div class="section-header">
                <h2>Produits disponibles</h2>
                <p>Parcourez des articles choisis pour le marché local.</p>
            </div>
            <div class="list-products">
                <article class="info-product">
                    <div class="product">
                        <a href="detail.html"><img src="photos/145pcs Bamboo Forest Theme Keycap Set, Retro Green Keycaps, PBT Keycap, Cherry Keycap, Mechanical Keyboard Keycap, Minimalism Keyboard Decor.jpeg" alt="Clavier personnalisé" /></a>
                    </div>
                    <div class="desc">
                        <span>12 000 FCFA</span>
                        <span class="chiffre">16 000 FCFA<div class="drop-price"></div></span>
                        <p class="desc-text">Clavier mécanique stylé</p>
                        <p class="desc-text">Grand confort et finition premium.</p>
                    </div>
                </article>
                <article class="info-product">
                    <div class="product">
                        <a href="detail.html"><img src="photos/Custom Coiled Keyboard USB Cable with Aviator Connector - GMK Dracula.jpeg" alt="Câble USB" /></a>
                    </div>
                    <div class="desc">
                        <span>4 500 FCFA</span>
                        <span class="chiffre">6 000 FCFA<div class="drop-price"></div></span>
                        <p class="desc-text">Câble USB artisanal</p>
                        <p class="desc-text">Design soigné et durable.</p>
                    </div>
                </article>
                <article class="info-product">
                    <div class="product">
                        <a href="detail.html"><img src="photos/picc3.jpeg" alt="Huile de karité" /></a>
                    </div>
                    <div class="desc">
                        <span>6 500 FCFA</span>
                        <span class="chiffre">8 900 FCFA<div class="drop-price"></div></span>
                        <p class="desc-text">Huile de karité pure</p>
                        <p class="desc-text">Soin naturel et traditionnel.</p>
                    </div>
                </article>
                <article class="info-product">
                    <div class="product">
                        <a href="detail.html"><img src="photos/picc4.jpeg" alt="Bijoux artisanaux" /></a>
                    </div>
                    <div class="desc">
                        <span>15 000 FCFA</span>
                        <span class="chiffre">19 500 FCFA<div class="drop-price"></div></span>
                        <p class="desc-text">Bijoux artisanaux</p>
                        <p class="desc-text">Style burkinabè moderne.</p>
                    </div>
                </article>
            </div>
        </section>
    </main>

    <footer>
        <div class="footer-grid">
            <div>
                <h3>AfriMarket</h3>
                <p>Market local burkinabè pour les meilleures offres.</p>
            </div>
            <div>
                <h4>Liens</h4>
                <ul>
                    <li><a href="index.html">Accueil</a></li>
                    <li><a href="contact.html">Contact</a></li>
                    <li><a href="panier.html">Panier</a></li>
                </ul>
            </div>
        </div>
    </footer>

    <script src="script.js"></script>
</body>

</html>
''',
    'detail.html': '''<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Détail produit AfriMarket : description, avis et options de commande pour les articles locaux." />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;500;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css" />
    <link rel="stylesheet" href="css/style.css" />
    <title>Détail produit | AfriMarket</title>
</head>

<body>
    <header>
        <a class="brand" href="index.html">
            <img src="photos/logo-afrimarket.svg" alt="Logo AfriMarket" />
            <span>AfriMarket</span>
        </a>
        <div class="search" id="searchIcon">
            <input type="text" placeholder="Rechercher un produit, une marque ou une catégorie..." />
        </div>
        <nav class="nav-menu" id="menu">
            <button class="navCloseBtn" aria-label="Fermer le menu"><i class="uil uil-times"></i></button>
            <ul>
                <li><a href="index.html">Accueil</a></li>
                <li><a href="products.html">Produits</a></li>
                <li><a href="contact.html">Contact</a></li>
                <li><a href="panier.html">Panier</a></li>
                <li><img src="photos/icon-bf-flag.svg" alt="Drapeau Burkina Faso" class="flag-icon" /></li>
                <li class="currency">FCFA</li>
            </ul>
        </nav>
        <button class="navOpenBtn" id="navOpenBtn" aria-label="Ouvrir le menu"><i class="uil uil-bars"></i></button>
    </header>

    <div class="sidebar" id="sidebar">
        <div class="cart-header">
            <div>
                <span>Mon panier</span>
                <strong>3 articles</strong>
            </div>
            <button class="close-btn" id="closeSidebarBtn" aria-label="Fermer le panier"><i class="uil uil-times"></i></button>
        </div>
        <div class="cart-content">
            <ul class="pro-list">
                <li class="pro-item">
                    <div class="pro-info">
                        <img src="photos/picc1.jpeg" alt="Sac artisanal" />
                        <div class="pro-details">
                            <span class="pro-name">Sac en pagne</span>
                            <span class="pro-payment-method">Orange Money</span>
                            <p class="pro-price" id="appliedCount1">12 000 FCFA</p>
                        </div>
                    </div>
                    <div class="pro-actions">
                        <div class="pro-icons">
                            <img src="photos/heart.png" alt="Ajouter aux favoris" />
                            <img src="photos/ic_outline-delete.png" alt="Supprimer du panier" class="remove-pro" />
                        </div>
                        <div class="count-pro">
                            <div class="count" data-product="1">-</div>
                            <span id="countValue1" data-product="1">1</span>
                            <div class="count-2" data-product="1">+</div>
                        </div>
                    </div>
                </li>
                <li class="pro-item">
                    <div class="pro-info">
                        <img src="photos/picc2.jpeg" alt="Sandales artisanales" />
                        <div class="pro-details">
                            <span class="pro-name">Sandales artisanales</span>
                            <span class="pro-payment-method">Carte bancaire</span>
                            <p class="pro-price" id="appliedCount2">8 900 FCFA</p>
                        </div>
                    </div>
                    <div class="pro-actions">
                        <div class="pro-icons">
                            <img src="photos/heart.png" alt="Ajouter aux favoris" />
                            <img src="photos/ic_outline-delete.png" alt="Supprimer du panier" class="remove-pro" />
                        </div>
                        <div class="count-pro">
                            <div class="count" data-product="2">-</div>
                            <span id="countValue2" data-product="2">1</span>
                            <div class="count-2" data-product="2">+</div>
                        </div>
                    </div>
                </li>
                <li class="pro-item">
                    <div class="pro-info">
                        <img src="photos/picc3.jpeg" alt="Huile de karité" />
                        <div class="pro-details">
                            <span class="pro-name">Huile de karité pure</span>
                            <span class="pro-payment-method">Moov Money</span>
                            <p class="pro-price" id="appliedCount3">6 500 FCFA</p>
                        </div>
                    </div>
                    <div class="pro-actions">
                        <div class="pro-icons">
                            <img src="photos/heart.png" alt="Ajouter aux favoris" />
                            <img src="photos/ic_outline-delete.png" alt="Supprimer du panier" class="remove-pro" />
                        </div>
                        <div class="count-pro">
                            <div class="count" data-product="3">-</div>
                            <span id="countValue3" data-product="3">1</span>
                            <div class="count-2" data-product="3">+</div>
                        </div>
                    </div>
                </li>
            </ul>
            <div class="cart-summary">
                <div><span>Total</span><strong id="total">27 400 FCFA</strong></div>
                <a href="panier.html" class="button primary">Voir le panier</a>
            </div>
        </div>
    </div>

    <div id="overlay"></div>

    <main class="detail-page">
        <section class="product-detail">
            <div class="detail-image">
                <img src="photos/145pcs Bamboo Forest Theme Keycap Set, Retro Green Keycaps, PBT Keycap, Cherry Keycap, Mechanical Keyboard Keycap, Minimalism Keyboard Decor.jpeg" alt="Clavier personnalisé burkinabè" />
            </div>
            <div class="detail-info">
                <span class="eyebrow">Produit vedette</span>
                <h1>Clavier mécanique édition limitée</h1>
                <p class="price">12 000 FCFA</p>
                <p>Un clavier mécanique haut de gamme avec un style unique, idéal pour les amateurs de design et de précision.</p>
                <ul class="product-bullets">
                    <li>Clés PBT durables</li>
                    <li>Finition élégante et résistante</li>
                    <li>Compatibilité universelle</li>
                </ul>
                <a href="panier.html" class="button primary">Ajouter au panier</a>
                <a href="products.html" class="button secondary">Retour aux produits</a>
            </div>
        </section>
    </main>

    <footer>
        <div class="footer-grid">
            <div>
                <h3>AfriMarket</h3>
                <p>Marché digital burkinabè, simple et moderne.</p>
            </div>
        </div>
    </footer>

    <script src="script.js"></script>
</body>

</html>
''',
    'panier.html': '''<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Panier AfriMarket - vérifiez vos articles et passez commande en FCFA." />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;500;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css" />
    <link rel="stylesheet" href="css/style.css" />
    <title>Panier | AfriMarket</title>
</head>

<body>
    <header>
        <a class="brand" href="index.html">
            <img src="photos/logo-afrimarket.svg" alt="Logo AfriMarket" />
            <span>AfriMarket</span>
        </a>
        <div class="search" id="searchIcon">
            <input type="text" placeholder="Rechercher un produit, une marque ou une catégorie..." />
        </div>
        <nav class="nav-menu" id="menu">
            <button class="navCloseBtn" aria-label="Fermer le menu"><i class="uil uil-times"></i></button>
            <ul>
                <li><a href="index.html">Accueil</a></li>
                <li><a href="products.html">Produits</a></li>
                <li><a href="contact.html">Contact</a></li>
                <li><img src="photos/icon-bf-flag.svg" alt="Drapeau Burkina Faso" class="flag-icon" /></li>
                <li class="currency">FCFA</li>
            </ul>
        </nav>
        <button class="navOpenBtn" id="navOpenBtn" aria-label="Ouvrir le menu"><i class="uil uil-bars"></i></button>
    </header>

    <main class="cart-page">
        <section class="cart-summary-page">
            <h1>Votre panier</h1>
            <div class="panier-item">
                <img src="photos/picc1.jpeg" alt="Sac artisanal" />
                <div>
                    <h2>Sac en pagne tissé</h2>
                    <p>12 000 FCFA</p>
                </div>
            </div>
            <div class="panier-item">
                <img src="photos/picc2.jpeg" alt="Sandales artisanales" />
                <div>
                    <h2>Sandales artisanales</h2>
                    <p>8 900 FCFA</p>
                </div>
            </div>
            <div class="panier-item">
                <img src="photos/picc3.jpeg" alt="Huile de karité" />
                <div>
                    <h2>Huile de karité pure</h2>
                    <p>6 500 FCFA</p>
                </div>
            </div>
            <div class="panier-total">
                <span>Total du panier</span>
                <strong>27 400 FCFA</strong>
            </div>
            <a href="#" class="button primary">Passer à la caisse</a>
        </section>
    </main>

    <footer>
        <div class="footer-grid">
            <div>
                <h3>AfriMarket</h3>
                <p>Support et commandes pour le marché local.</p>
            </div>
        </div>
    </footer>

    <script src="script.js"></script>
</body>

</html>
''',
    'contact.html': '''<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Contactez AfriMarket pour les commandes, le support et les partenaires burkinabè." />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;500;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://unicons.iconscout.com/release/v4.0.0/css/line.css" />
    <link rel="stylesheet" href="css/contact.css" />
    <title>Contact | AfriMarket</title>
</head>

<body>
    <header>
        <a class="brand" href="index.html">
            <img src="photos/logo-afrimarket.svg" alt="Logo AfriMarket" />
            <span>AfriMarket</span>
        </a>
        <div class="search" id="searchIcon">
            <input type="text" placeholder="Rechercher un produit, une marque ou une catégorie..." />
        </div>
        <nav class="nav-menu" id="menu">
            <button class="navCloseBtn" aria-label="Fermer le menu"><i class="uil uil-times"></i></button>
            <ul>
                <li><a href="index.html">Accueil</a></li>
                <li><a href="products.html">Produits</a></li>
                <li><a href="panier.html">Panier</a></li>
                <li><img src="photos/icon-bf-flag.svg" alt="Drapeau Burkina Faso" class="flag-icon" /></li>
                <li class="currency">FCFA</li>
            </ul>
        </nav>
        <button class="navOpenBtn" id="navOpenBtn" aria-label="Ouvrir le menu"><i class="uil uil-bars"></i></button>
    </header>

    <main class="contact-page">
        <section class="contact-hero">
            <div>
                <span>Contact</span>
                <h1>Nous sommes là pour vous aider</h1>
                <p>Pour toute question sur votre commande, la livraison ou le partenariat, contactez-nous.</p>
                <div class="contact-details">
                    <div><strong>Support</strong><span>support@afrimarket.bf</span></div>
                    <div><strong>Livraison</strong><span>Ouagadougou, Bobo-Dioulasso, Koudougou</span></div>
                </div>
            </div>
            <div class="contact-visual">
                <img src="photos/undraw_Contact_us_re_4qqt.png" alt="Support client" />
            </div>
        </section>

        <section class="contact-form-section">
            <div class="form-card">
                <h2>Envoyez-nous un message</h2>
                <form id="myForm">
                    <label for="fullName">Nom complet</label>
                    <input type="text" id="fullName" placeholder="Nom complet" />
                    <label for="email">Email</label>
                    <input type="email" id="email" placeholder="email@exemple.com" />
                    <label for="confirmEmail">Confirmer email</label>
                    <input type="email" id="confirmEmail" placeholder="Confirmer email" />
                    <label for="message">Message</label>
                    <textarea id="message" placeholder="Expliquez votre demande..."></textarea>
                    <button type="submit">Envoyer</button>
                </form>
            </div>
            <div class="info-card">
                <h3>Nos services</h3>
                <ul>
                    <li>Support commande</li>
                    <li>Livraison nationale</li>
                    <li>Partenariat artisans</li>
                    <li>Réclamations et retours</li>
                </ul>
            </div>
        </section>
    </main>

    <footer>
        <div class="footer-section">
            <h3>AfriMarket</h3>
            <p>Service client et commerce local au Burkina Faso.</p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>

</html>
''',
    'script.js': '''const nav = document.getElementById("menu");
const searchIcon = document.getElementById("searchIcon");
const navOpenBtn = document.getElementById("navOpenBtn");
const navCloseBtn = document.querySelector(".navCloseBtn");
const accessoriesList = document.getElementById("accessoriesList");
const clickToShowList = document.getElementById("clickToShowList");
const sidebar = document.getElementById("sidebar");
const openSidebarBtn = document.getElementById("navOpenPanier");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const overlay = document.getElementById("overlay");
const swiperContainerWrapper = document.querySelector(".swiper-container-wrapper");
const removepro = document.querySelectorAll(".remove-pro");
const searchInput = document.getElementById("searchInput");

const productCounts = { 1: 1, 2: 1, 3: 1 };
const productPrices = { 1: 12000, 2: 8900, 3: 6500 };

function formatPrice(value) {
  return value.toLocaleString('fr-FR') + ' FCFA';
}

function updateProduct(product, increment) {
  if (!productCounts[product]) return;
  if (increment) {
    if (productCounts[product] < 10) productCounts[product]++;
  } else if (productCounts[product] > 1) {
    productCounts[product]--;
  }
  const countValueElement = document.getElementById(`countValue${product}`);
  const appliedCountElement = document.getElementById(`appliedCount${product}`);
  if (!countValueElement || !appliedCountElement) return;
  countValueElement.innerText = productCounts[product];
  appliedCountElement.innerText = formatPrice(productCounts[product] * productPrices[product]);
  updateTotalPrice();
}

function updateTotalPrice() {
  const totalElement = document.getElementById('total');
  if (!totalElement) return;
  const total = Object.keys(productCounts).reduce((acc, product) => {
    return acc + productCounts[product] * productPrices[product];
  }, 0);
  totalElement.innerText = formatPrice(total);
}

document.querySelectorAll('.count').forEach(button => {
  button.addEventListener('click', () => {
    updateProduct(button.dataset.product, false);
  });
});

document.querySelectorAll('.count-2').forEach(button => {
  button.addEventListener('click', () => {
    updateProduct(button.dataset.product, true);
  });
});

openSidebarBtn?.addEventListener('click', () => {
  sidebar.style.right = '0';
  overlay.style.display = 'block';
  document.body.classList.add('blurred');
  swiperContainerWrapper?.classList.add('blurred-container');
});

closeSidebarBtn?.addEventListener('click', () => {
  sidebar.style.right = '-100%';
  overlay.style.display = 'none';
  document.body.classList.remove('blurred');
  swiperContainerWrapper?.classList.remove('blurred-container');
});

clickToShowList?.addEventListener('click', () => {
  if (accessoriesList.style.display === 'none' || accessoriesList.style.display === '') {
    accessoriesList.style.display = 'grid';
  } else {
    accessoriesList.style.display = 'none';
  }
});

navOpenBtn?.addEventListener('click', () => {
  nav?.classList.add('openNav');
});

navCloseBtn?.addEventListener('click', () => {
  nav?.classList.remove('openNav');
});

removepro.forEach(button => {
  button.addEventListener('click', () => {
    const product = button.closest('.pro-item');
    if (!product) return;
    const productPriceElement = product.querySelector('.pro-price');
    if (!productPriceElement) return;
    const productPrice = parseInt(productPriceElement.innerText.replace(/\D/g, ''), 10);
    const totalElement = document.getElementById('total');
    if (totalElement) {
      const currentTotal = parseInt(totalElement.innerText.replace(/\D/g, ''), 10);
      totalElement.innerText = formatPrice(Math.max(0, currentTotal - productPrice));
    }
    product.remove();
  });
});

const contactForm = document.getElementById('myForm');
if (contactForm) {
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const confirmEmail = document.getElementById('confirmEmail').value.trim();
    const message = document.getElementById('message').value.trim();
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]{2,50}$/;
    if (!nameRegex.test(fullName)) {
      alert('Veuillez entrer un nom valide.');
      return;
    }
    if (!emailRegex.test(email)) {
      alert('Veuillez entrer une adresse email valide.');
      return;
    }
    if (email !== confirmEmail) {
      alert('Les adresses email ne correspondent pas.');
      return;
    }
    if (message.length < 10) {
      alert('Le message doit contenir au moins 10 caractères.');
      return;
    }
    alert('Votre message a bien été envoyé. Merci !');
    contactForm.reset();
  });
}
''',
    'css/style.css': '''...''' ,
    'css/contact.css': '''...'''
}

# Replace placeholder strings for big CSS content
files['css/style.css'] = '''...'''
files['css/contact.css'] = '''...'''

for name, content in files.items():
    Path(name).write_text(content, encoding='utf-8')
print('wrote', ', '.join(files.keys()))
'''}