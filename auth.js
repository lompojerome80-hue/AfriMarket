/* auth.js — Système d'inscription AfriMarket
   Affiche un modal d'inscription à la première visite.
   Stocke les infos dans localStorage + Supabase. */

(function () {
  const STORAGE_KEY = 'afrimarket_user';
  const MODAL_ID = 'authModal';

  // Vérifie si l'utilisateur est déjà inscrit
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  // Sauvegarde l'utilisateur
  function saveUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  // Crée le HTML du modal
  function createModalHTML() {
    return `
      <div id="${MODAL_ID}" class="auth-overlay" style="display:none;">
        <div class="auth-modal">
          <button class="auth-close" id="authCloseBtn" aria-label="Fermer">&times;</button>

          <div class="auth-header">
            <div class="auth-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h2>Bienvenue sur AfriMarket</h2>
            <p>Créez votre compte pour commencer à acheter et vendre</p>
          </div>

          <form id="authForm" class="auth-form" novalidate>
            <div class="auth-field">
              <label for="authNom">Nom complet</label>
              <input type="text" id="authNom" placeholder="Ex: Mamadou Ouédraogo" required />
            </div>

            <div class="auth-field">
              <label for="authEmail">Adresse e-mail</label>
              <input type="email" id="authEmail" placeholder="Ex: mamadou@email.com" required />
            </div>

            <div class="auth-field">
              <label for="authPhone">Téléphone</label>
              <input type="tel" id="authPhone" placeholder="Ex: +226 70 12 34 56" required />
            </div>

            <div class="auth-field">
              <label for="authRole">Je suis</label>
              <select id="authRole" required>
                <option value="">-- Choisir --</option>
                <option value="acheteur">Acheteur</option>
                <option value="vendeur">Vendeur</option>
                <option value="les deux">Acheteur & Vendeur</option>
              </select>
            </div>

            <button type="submit" class="auth-submit" id="authSubmitBtn">
              <span class="auth-submit-text">Créer mon compte</span>
              <span class="auth-submit-loader" style="display:none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></circle></svg>
              </span>
            </button>

            <p class="auth-error" id="authError" style="display:none;"></p>
          </form>

          <div class="auth-footer">
            <p>En continuant, vous acceptez les <a href="#">conditions d'utilisation</a> d'AfriMarket.</p>
          </div>
        </div>
      </div>
    `;
  }

  // CSS du modal
  function createModalCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .auth-overlay {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(15,14,35,0.7);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: authFadeIn .35s ease;
      }
      @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }

      .auth-modal {
        background: #fff; border-radius: 18px;
        width: 100%; max-width: 440px;
        padding: 36px 32px 28px;
        box-shadow: 0 24px 80px rgba(15,14,35,0.25);
        position: relative;
        animation: authSlideUp .4s cubic-bezier(.22,.61,.36,1);
      }
      @keyframes authSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

      .auth-close {
        position: absolute; top: 14px; right: 16px;
        background: none; border: none; font-size: 26px;
        color: #8E8C9E; cursor: pointer; line-height: 1;
        transition: color .2s;
      }
      .auth-close:hover { color: #E62E04; }

      .auth-header { text-align: center; margin-bottom: 28px; }
      .auth-logo-mark {
        width: 52px; height: 52px; border-radius: 14px;
        background: linear-gradient(135deg, #E62E04, #FF6B3D);
        display: inline-flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 16px rgba(230,46,4,0.3);
        margin-bottom: 16px;
      }
      .auth-logo-mark svg { width: 26px; height: 26px; }
      .auth-header h2 { font-size: 22px; font-weight: 800; color: #1A1A1A; margin: 0 0 6px; }
      .auth-header p { font-size: 13.5px; color: #62606F; margin: 0; }

      .auth-form { display: flex; flex-direction: column; gap: 16px; }
      .auth-field { display: flex; flex-direction: column; gap: 5px; }
      .auth-field label { font-size: 12.5px; font-weight: 600; color: #1A1A1A; }
      .auth-field input, .auth-field select {
        width: 100%; font-size: 14px; padding: 12px 14px;
        border: 1.5px solid #E7E4EE; border-radius: 10px;
        color: #1A1A1A; background: #F6F5F9;
        transition: border-color .2s, box-shadow .2s;
        outline: none;
      }
      .auth-field input::placeholder { color: #8E8C9E; }
      .auth-field input:focus, .auth-field select:focus {
        border-color: #E62E04;
        box-shadow: 0 0 0 3px rgba(230,46,4,0.12);
        background: #fff;
      }
      .auth-field select { cursor: pointer; appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2362606F' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 14px center;
        padding-right: 36px;
      }

      .auth-submit {
        width: 100%; padding: 14px; border: none; border-radius: 10px;
        background: linear-gradient(135deg, #E62E04, #FF6B3D);
        color: #fff; font-size: 15px; font-weight: 700;
        cursor: pointer; margin-top: 4px;
        box-shadow: 0 4px 16px rgba(230,46,4,0.25);
        transition: transform .2s, box-shadow .2s;
        display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .auth-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(230,46,4,0.3); }
      .auth-submit:active { transform: translateY(0); }

      .auth-error {
        font-size: 12.5px; color: #E62E04; text-align: center;
        background: rgba(230,46,4,0.06); padding: 10px 14px;
        border-radius: 8px; margin: 0;
      }

      .auth-footer { text-align: center; margin-top: 20px; }
      .auth-footer p { font-size: 11.5px; color: #8E8C9E; margin: 0; }
      .auth-footer a { color: #E62E04; font-weight: 600; }
      .auth-footer a:hover { text-decoration: underline; }

      @media (max-width: 480px) {
        .auth-modal { padding: 28px 22px 22px; }
        .auth-header h2 { font-size: 19px; }
      }
    `;
    document.head.appendChild(style);
  }

  // Affiche le modal
  function showModal() {
    // Injecte le HTML si pas encore présent
    if (!document.getElementById(MODAL_ID)) {
      const div = document.createElement('div');
      div.innerHTML = createModalHTML();
      document.body.appendChild(div.firstElementChild);
    }

    const overlay = document.getElementById(MODAL_ID);
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Fermer
    document.getElementById('authCloseBtn').addEventListener('click', () => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    });

    // Fermer en cliquant sur l'overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
      }
    });

    // Soumettre
    document.getElementById('authForm').addEventListener('submit', handleSubmit);
  }

  // Gestion de la soumission
  async function handleSubmit(e) {
    e.preventDefault();

    const nom = document.getElementById('authNom').value.trim();
    const email = document.getElementById('authEmail').value.trim();
    const phone = document.getElementById('authPhone').value.trim();
    const role = document.getElementById('authRole').value;
    const errorEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');
    const submitText = submitBtn.querySelector('.auth-submit-text');
    const submitLoader = submitBtn.querySelector('.auth-submit-loader');

    // Validation
    errorEl.style.display = 'none';

    if (!nom || nom.length < 2) {
      errorEl.textContent = 'Veuillez entrer votre nom complet.';
      errorEl.style.display = 'block';
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = 'Veuillez entrer une adresse e-mail valide.';
      errorEl.style.display = 'block';
      return;
    }
    if (!phone || phone.replace(/\s/g, '').length < 8) {
      errorEl.textContent = 'Veuillez entrer un numéro de téléphone valide.';
      errorEl.style.display = 'block';
      return;
    }
    if (!role) {
      errorEl.textContent = 'Veuillez choisir votre profil.';
      errorEl.style.display = 'block';
      return;
    }

    // Loader
    submitText.style.display = 'none';
    submitLoader.style.display = 'inline-flex';
    submitBtn.disabled = true;

    const user = {
      nom,
      email,
      telephone: phone,
      role,
      dateInscription: new Date().toISOString(),
    };

    try {
      // Essayer de sauvegarder dans Supabase (table 'comptes' ou 'users')
      // Si la table n'existe pas, on sauvegarde juste en localStorage
      if (typeof sb !== 'undefined') {
        try {
          const { error } = await sb.from('comptes').insert({
            nom: user.nom,
            email: user.email,
            telephone: user.telephone,
            role: user.role,
          });
          if (error) console.warn('Supabase insert skipped:', error.message);
        } catch (err) {
          console.warn('Supabase not available, saving locally only');
        }
      }
    } catch (err) {
      console.warn('DB save failed, continuing with localStorage');
    }

    // Toujours sauvegarder en localStorage
    saveUser(user);

    // Fermer le modal
    const overlay = document.getElementById(MODAL_ID);
    overlay.style.display = 'none';
    document.body.style.overflow = '';

    // Mettre à jour l'UI si des éléments existent
    updateUI(user);

    // Notification
    showAuthToast(`Bienvenue ${user.nom} ! Votre compte a été créé.`);
  }

  // Met à jour l'interface avec les infos utilisateur
  function updateUI(user) {
    // Mettre à jour le bouton "Compte" dans le header
    const acctBtns = document.querySelectorAll('.acct');
    acctBtns.forEach((btn) => {
      const small = btn.querySelector('small');
      const main = btn.childNodes[btn.childNodes.length - 1];
      if (small) small.textContent = user.nom.split(' ')[0];
    });

    // Mettre à jour le lien "Mon compte"
    const accountLinks = document.querySelectorAll('a[href="compte.html"]');
    accountLinks.forEach((link) => {
      link.textContent = user.nom.split(' ')[0];
    });
  }

  // Toast de bienvenue
  function showAuthToast(message) {
    const existing = document.querySelector('.auth-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'auth-toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E7A46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>${message}</span>
    `;
    toast.style.cssText = `
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #1A1A1A; color: #fff; padding: 14px 24px; border-radius: 12px;
      font-size: 13.5px; font-weight: 600; z-index: 10001;
      box-shadow: 0 12px 40px rgba(0,0,0,0.2);
      display: flex; align-items: center; gap: 10px;
      opacity: 0; transition: opacity .35s ease, transform .35s ease;
      font-family: 'Inter', sans-serif;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // === INIT ===
  document.addEventListener('DOMContentLoaded', () => {
    createModalCSS();

    const user = getUser();
    if (!user) {
      // Première visite → afficher le modal après un court délai
      setTimeout(showModal, 800);
    } else {
      // Utilisateur déjà inscrit → mettre à jour l'UI
      updateUI(user);
    }

    // Exposer globalement pour utilisation externe
    window.AfriAuth = {
      getUser,
      saveUser,
      showModal,
      logout: () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      },
    };
  });
})();
