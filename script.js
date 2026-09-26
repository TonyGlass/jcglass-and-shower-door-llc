document.addEventListener("DOMContentLoaded", () => {

  /* ---------- HERO IMAGE SLIDER ---------- */
  const hero = document.getElementById("hero");
  if (hero) {
    const heroImages = Array.from(hero.querySelectorAll(".hero-img"));
    const heroButtons = Array.from(hero.querySelectorAll(".hero-slider-button"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    const { signal } = controller;
    let heroIndex = Math.max(0, heroImages.findIndex((image) => image.classList.contains("is-active")));
    let slideTimer = 0;
    let switchToken = 0;
    let pointerInside = false;
    let focusInside = false;
    let pageVisible = !document.hidden;

    const clearSlideTimer = () => {
      window.clearTimeout(slideTimer);
      slideTimer = 0;
    };

    const isPaused = () =>
      pointerInside || focusInside || !pageVisible || reduceMotion.matches;

    const setActiveImage = (index) => {
      heroIndex = index;
      heroImages.forEach((image, i) => {
        const active = i === heroIndex;
        image.classList.toggle("is-active", active);
        image.setAttribute("aria-hidden", String(!active));
      });
      heroButtons.forEach((button, i) => {
        button.setAttribute("aria-pressed", String(i === heroIndex));
      });
    };

    const imageIsReady = async (image) => {
      image.loading = "eager";
      try {
        if (typeof image.decode === "function") await image.decode();
        else if (!image.complete) {
          await new Promise((resolve, reject) => {
            image.addEventListener("load", resolve, { once: true, signal });
            image.addEventListener("error", reject, { once: true, signal });
          });
        }
      } catch {
        // A decode can reject for an already loaded image; naturalWidth is authoritative.
      }
      return image.complete && image.naturalWidth > 0;
    };

    const showHeroImage = async (index, manual = false) => {
      if (!heroImages.length) return false;
      const targetIndex = (index + heroImages.length) % heroImages.length;
      const token = ++switchToken;
      const image = heroImages[targetIndex];
      if (!(await imageIsReady(image)) || token !== switchToken || (!manual && isPaused())) return false;
      setActiveImage(targetIndex);
      return true;
    };

    const scheduleNextSlide = () => {
      clearSlideTimer();
      if (isPaused() || heroImages.length < 2) return;
      slideTimer = window.setTimeout(async () => {
        await showHeroImage(heroIndex + 1);
        scheduleNextSlide();
      }, 5500);
    };

    const pauseRotation = () => clearSlideTimer();
    heroButtons.forEach((button, index) => {
      button.addEventListener("click", async () => {
        pauseRotation();
        if (pointerInside) focusInside = false;
        await showHeroImage(index, true);
        scheduleNextSlide();
      }, { signal });
    });

    hero.addEventListener("pointerenter", () => {
      pointerInside = true;
      pauseRotation();
    }, { signal });
    hero.addEventListener("pointerleave", () => {
      pointerInside = false;
      scheduleNextSlide();
    }, { signal });
    hero.addEventListener("focusin", () => {
      focusInside = true;
      pauseRotation();
    }, { signal });
    hero.addEventListener("focusout", (event) => {
      if (!hero.contains(event.relatedTarget)) {
        focusInside = false;
        scheduleNextSlide();
      }
    }, { signal });
    document.addEventListener("visibilitychange", () => {
      pageVisible = !document.hidden;
      scheduleNextSlide();
    }, { signal });

    const handleMotionPreference = () => scheduleNextSlide();
    if (typeof reduceMotion.addEventListener === "function") {
      reduceMotion.addEventListener("change", handleMotionPreference, { signal });
    } else {
      reduceMotion.addListener(handleMotionPreference);
      window.addEventListener("pagehide", () => {
        reduceMotion.removeListener(handleMotionPreference);
      }, { once: true, signal });
    }

    window.addEventListener("pagehide", () => {
      clearSlideTimer();
      controller.abort();
    }, { once: true, signal });
    scheduleNextSlide();
  }

  /* ---------- HEADER SCROLL STATE ---------- */
  const header = document.getElementById("site-header");

  const updateHeader = () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- MOBILE MENU ---------- */
  const menuToggle = document.getElementById("menu-toggle");
  const mainNav = document.getElementById("main-nav");
  const navOverlay = document.getElementById("nav-overlay");

  const closeMenu = () => {
    menuToggle.classList.remove("is-open");
    mainNav.classList.remove("is-open");
    navOverlay.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  const openMenu = () => {
    menuToggle.classList.add("is-open");
    mainNav.classList.add("is-open");
    navOverlay.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };

  menuToggle.addEventListener("click", () => {
    mainNav.classList.contains("is-open") ? closeMenu() : openMenu();
  });

  navOverlay.addEventListener("click", closeMenu);
  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- SCROLL REVEAL ---------- */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- GALLERY LIGHTBOX ---------- */
  const galleryItems = Array.from(document.querySelectorAll(".gallery-item"));
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");

  let currentIndex = 0;

  const showImage = (index) => {
    currentIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[currentIndex];
    const img = item.querySelector("img");
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = item.dataset.tag || "";
  };

  const openLightbox = (index) => {
    showImage(index);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  galleryItems.forEach((item, index) => {
    item.addEventListener("click", () => openLightbox(index));
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", () => showImage(currentIndex - 1));
  lightboxNext.addEventListener("click", () => showImage(currentIndex + 1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
  });

  /* ---------- QUOTE WIZARD ---------- */
  const quoteForm = document.getElementById("quote-form");

  if (quoteForm) {
    const steps = Array.from(quoteForm.querySelectorAll(".quote-step[data-step]"));
    const progressSteps = Array.from(document.querySelectorAll(".progress-step"));
    const backBtn = document.getElementById("quote-back");
    const nextBtn = document.getElementById("quote-next");
    const submitBtn = document.getElementById("quote-submit");
    const quoteNav = document.getElementById("quote-nav");
    const photoInput = document.getElementById("q-photos");
    const photoGrid = document.getElementById("photo-preview-grid");
    const summaryEl = document.getElementById("quote-summary");
    const serviceOptions = Array.from(quoteForm.querySelectorAll(".service-option"));

    const TOTAL_STEPS = 5;
    let currentStep = 1;
    let photoFiles = [];

    /* Step display + progress indicator */
    const goToStep = (step) => {
      currentStep = step;

      steps.forEach((el) => {
        el.classList.toggle("is-active", el.dataset.step === String(step));
      });

      progressSteps.forEach((el) => {
        const n = Number(el.dataset.step);
        el.classList.toggle("is-active", n === step);
        el.classList.toggle("is-complete", n < step);
      });

      backBtn.hidden = step === 1;
      nextBtn.hidden = step === TOTAL_STEPS;
      submitBtn.hidden = step !== TOTAL_STEPS;

      if (step === TOTAL_STEPS) renderSummary();
    };

    /* Validate only the fields visible in the current step */
    const validateStep = (step) => {
      if (step === 1) {
        if (!quoteForm.querySelector('input[name="service"]:checked')) {
          alert("Please choose a service to continue.");
          return false;
        }
      }

      if (step === 4) {
        const name = quoteForm.querySelector('[name="name"]');
        const phone = quoteForm.querySelector('[name="phone"]');
        if (!name.value.trim() || !phone.value.trim()) {
          alert("Please enter your name and phone number to continue.");
          return false;
        }
      }

      return true;
    };

    nextBtn.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
    });

    backBtn.addEventListener("click", () => {
      if (currentStep > 1) goToStep(currentStep - 1);
    });

    serviceOptions.forEach((option) => {
      option.addEventListener("click", () => {
        serviceOptions.forEach((o) => o.classList.remove("is-checked"));
        option.classList.add("is-checked");
      });
    });

    /* Step 2 — photo upload with thumbnail preview + remove */
    const syncPhotoInput = () => {
      const dataTransfer = new DataTransfer();
      photoFiles.forEach((file) => dataTransfer.items.add(file));
      photoInput.files = dataTransfer.files;
    };

    const renderPhotoPreviews = () => {
      photoGrid.innerHTML = "";
      photoFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const item = document.createElement("div");
        item.className = "photo-preview-item";
        item.innerHTML = `
          <img src="${url}" alt="Uploaded project photo ${index + 1}">
          <button type="button" class="photo-remove" aria-label="Remove photo">&times;</button>
        `;
        item.querySelector(".photo-remove").addEventListener("click", () => {
          photoFiles.splice(index, 1);
          syncPhotoInput();
          renderPhotoPreviews();
        });
        photoGrid.appendChild(item);
      });
    };

    photoInput.addEventListener("change", () => {
      photoFiles = photoFiles.concat(Array.from(photoInput.files));
      syncPhotoInput();
      renderPhotoPreviews();
    });

    /* Step 5 — review summary */
    const renderSummary = () => {
      const data = new FormData(quoteForm);
      const rows = [
        ["Service", data.get("service") || "Not selected"],
        ["Width", data.get("width") || "-"],
        ["Height", data.get("height") || "-"],
        ["Quantity", data.get("quantity") || "-"],
        ["Notes", data.get("notes") || "-"],
        ["Full Name", data.get("name") || "-"],
        ["Phone", data.get("phone") || "-"],
        ["Email", data.get("email") || "-"],
        ["City", data.get("city") || "-"],
      ];

      summaryEl.innerHTML = rows
        .map(([label, value]) => `
          <div class="summary-row">
            <dt>${label}</dt>
            <dd>${value}</dd>
          </div>
        `)
        .join("");

      if (photoFiles.length) {
        const photosRow = document.createElement("div");
        photosRow.className = "summary-row";
        photosRow.innerHTML = `
          <dt>Photos</dt>
          <dd class="summary-photos">
            ${photoFiles.map((f) => `<img src="${URL.createObjectURL(f)}" alt="Project photo">`).join("")}
          </dd>
        `;
        summaryEl.appendChild(photosRow);
      }
    };

    /* Single hand-off point: swap this out for a Supabase insert once the backend is connected. */
    const submitQuoteRequest = (payload) => {
      const lines = [
        "Hello JCGLASS AND SHOWER DOOR LLC, I'd like to request a quote.",
        `Service: ${payload.service}`,
        `Width: ${payload.width}`,
        `Height: ${payload.height}`,
        `Quantity: ${payload.quantity}`,
        `Notes: ${payload.notes}`,
        `Name: ${payload.name}`,
        `Phone: ${payload.phone}`,
        `Email: ${payload.email}`,
        `City: ${payload.city}`,
      ];

      if (payload.photoCount > 0) {
        lines.push(`Photos: ${payload.photoCount} attached (I'll send them here in the chat).`);
      }

      const message = encodeURIComponent(lines.join("\n"));
      window.open(`https://wa.me/19545575153?text=${message}`, "_blank", "noopener");
    };

    quoteForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const data = new FormData(quoteForm);
      submitQuoteRequest({
        service: data.get("service") || "-",
        width: data.get("width") || "-",
        height: data.get("height") || "-",
        quantity: data.get("quantity") || "-",
        notes: data.get("notes") || "-",
        name: data.get("name") || "-",
        phone: data.get("phone") || "-",
        email: data.get("email") || "-",
        city: data.get("city") || "-",
        photoCount: photoFiles.length,
      });

      steps.forEach((el) => el.classList.remove("is-active"));
      quoteForm.querySelector('.quote-step[data-step="confirmation"]').classList.add("is-active");
      document.querySelector(".quote-progress").style.display = "none";
      quoteNav.style.display = "none";
    });

    goToStep(1);
  }

});
