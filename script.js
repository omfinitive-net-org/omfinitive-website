// =============================================
// OMFiNiTiVE Website Scripts
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  // Navigation scroll effect
  const nav = document.getElementById('nav');
  const handleScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile navigation toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    // Animate hamburger
    const spans = navToggle.querySelectorAll('span');
    if (navLinks.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

  // Close mobile nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      const spans = navToggle.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    });
  });

  // Hero particles
  const particlesContainer = document.getElementById('heroParticles');
  if (particlesContainer) {
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
      particle.style.animationDelay = (Math.random() * 10) + 's';
      particle.style.width = particle.style.height = (Math.random() * 3 + 1) + 'px';
      particlesContainer.appendChild(particle);
    }
  }

  // Scroll-triggered fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.solution-card, .feature-card, .contact-item, .value').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });

  // Stagger animation delays for grid items
  document.querySelectorAll('.solutions-grid .solution-card').forEach((card, i) => {
    card.style.animationDelay = (i * 0.15) + 's';
  });

  document.querySelectorAll('.features-grid .feature-card').forEach((card, i) => {
    card.style.animationDelay = (i * 0.1) + 's';
  });

  document.querySelectorAll('.about-values .value').forEach((val, i) => {
    val.style.animationDelay = (i * 0.1) + 's';
  });

  // Contact form handling via Cloudflare Worker
  const WORKER_URL = 'https://omfinitive-contact.omfinitive-net.workers.dev';
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');

  function showStatus(message, isError) {
    formStatus.textContent = message;
    formStatus.className = 'form-status ' + (isError ? 'form-status-error' : 'form-status-success');
    formStatus.style.display = 'block';
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      formStatus.style.display = 'none';

      // Get Turnstile token
      const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
      if (!turnstileToken) {
        showStatus('Please complete the captcha verification.', true);
        return;
      }

      const formData = new FormData(contactForm);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        organisation: formData.get('organisation'),
        interest: formData.get('interest'),
        message: formData.get('message'),
        turnstileToken: turnstileToken,
      };

      // Validate
      if (!data.name || !data.email || !data.message) {
        showStatus('Please fill in all required fields.', true);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const response = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showStatus('Thank you! Your message has been sent successfully.', false);
          contactForm.reset();
          // Reset Turnstile widget
          if (window.turnstile) {
            turnstile.reset();
          }
        } else {
          showStatus(result.error || 'Something went wrong. Please try again.', true);
        }
      } catch (err) {
        showStatus('Network error. Please check your connection and try again.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const navHeight = nav.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });
});
