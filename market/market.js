
(() => {
  "use strict";

  const grids = {
    affiliate: document.getElementById("amazon-product-grid"),
    partner: document.getElementById("partner-product-grid"),
    sarvyanta: document.getElementById("sarvyanta-product-grid")
  };

  const categoryContainer = document.getElementById("categories");
  const searchInput = document.getElementById("product-search");
  const sortSelect = document.getElementById("product-sort");
  const resultCount = document.getElementById("result-count");
  const emptyState = document.getElementById("empty-state");
  const clearButton = document.getElementById("clear-filters");
  const year = document.getElementById("current-year");
  const WHATSAPP_NUMBER = "917386406514";

  let products = [];
  let selectedCategory = "all";
  let searchTerm = "";
  let searchTrackingTimeout = null;
  let lastTrackedSearch = "";

  // ========================================
  // BASIC PAGE SETUP
  // ========================================

  if (year) year.textContent = new Date().getFullYear();

  const safeText = value => String(value ?? "");

  const titleCase = value =>
    String(value || "")
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  function productType(product) {
    if (product.type === "partner") return "partner";
    if (product.type === "sarvyanta") return "sarvyanta";
    return "affiliate";
  }

  // ========================================
  // GOOGLE ANALYTICS 4 EVENT TRACKING
  // ========================================

  function trackMarketEvent(eventName, product = null, extra = {}) {
    if (typeof window.gtag !== "function") return;

    const eventData = {
      page_type: "market",
      ...extra
    };

    if (product && typeof product === "object") {
      eventData.product_id = safeText(product.id || "unknown");
      eventData.product_name = safeText(product.name || "unknown");
      eventData.product_category = safeText(
        product.category || "uncategorized"
      );
      eventData.product_type = productType(product);
    }

    window.gtag("event", eventName, eventData);
  }

  // ========================================
  // AMAZON AFFILIATE URL VALIDATION
  // ========================================

  function validAffiliateUrl(value) {
    if (!value || typeof value !== "string") return null;

    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();

      if (url.protocol !== "https:") return null;

      if (
        host === "amzn.to" ||
        host === "amazon.in" ||
        host.endsWith(".amazon.in") ||
        host === "amazon.com" ||
        host.endsWith(".amazon.com")
      ) {
        return url.href;
      }
    } catch (_) {
      // Invalid URL.
    }

    return null;
  }

  function trackAffiliateClick(product) {
    trackMarketEvent("affiliate_click", product, {
      affiliate_program: "amazon",
      link_url: product.affiliateUrl || ""
    });
  }

  // ========================================
  // PRODUCT IMAGE PLACEHOLDER
  // ========================================

  function addPlaceholder(imageWrap) {
    if (imageWrap.querySelector(".product-placeholder")) return;

    const placeholder = document.createElement("div");
    placeholder.className = "product-placeholder";
    placeholder.textContent = "✦";
    placeholder.setAttribute("aria-hidden", "true");

    imageWrap.appendChild(placeholder);
  }

  // ========================================
  // CREATE PRODUCT CARD
  // ========================================

  function createProductCard(product) {
    const type = productType(product);

    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = safeText(product.id);
    card.tabIndex = 0;

    card.setAttribute(
      "aria-label",
      "View product details: " + safeText(product.name)
    );

    if (type === "partner") {
      card.classList.add("partner-card");
    }

    // Product image.
    const imageWrap = document.createElement("div");
    imageWrap.className = "product-image-wrap";

    if (product.imageUrl) {
      const img = document.createElement("img");

      img.className = "product-image";
      img.src = product.imageUrl;
      img.alt = safeText(product.imageAlt || product.name);
      img.loading = "lazy";
      img.decoding = "async";

      img.onerror = () => {
        img.dataset.imageError = "true";
        img.remove();
        addPlaceholder(imageWrap);
      };

      imageWrap.appendChild(img);
    } else {
      addPlaceholder(imageWrap);
    }

    // Product badge.
    const badge = document.createElement("span");
    badge.className = "product-badge";

    if (type === "partner") {
      badge.textContent = "SARVYANTA PARTNER";
      badge.classList.add("partner-badge");
    } else if (type === "sarvyanta") {
      badge.textContent = "SARVYANTA PRODUCT";
      badge.classList.add("own-badge");
    } else {
      badge.textContent = "AMAZON FIND";
    }

    imageWrap.appendChild(badge);

    // Product information.
    const info = document.createElement("div");
    info.className = "product-info";

    const category = document.createElement("p");
    category.className = "product-category";
    category.textContent = titleCase(product.category || "general");

    const title = document.createElement("h3");
    title.className = "product-title";
    title.textContent = safeText(product.name);

    const description = document.createElement("p");
    description.className = "product-description";
    description.textContent = safeText(product.description);

    info.append(category, title, description);

    // Price.
    if (
      product.price !== undefined &&
      product.price !== null &&
      product.price !== ""
    ) {
      const price = document.createElement("p");
      price.className = "product-price";

      price.textContent =
        safeText(product.currency || "₹") +
        safeText(product.price);

      const note = document.createElement("small");

      note.textContent = product.priceNote
        ? " " + safeText(product.priceNote)
        : " · Check current price";

      price.appendChild(note);
      info.appendChild(price);
    }

    // Amazon affiliate product.
    if (type === "affiliate") {
      const action = document.createElement("a");
      action.className = "product-action";
      action.textContent =
        product.buttonLabel || "View on Amazon ↗";

      const url = validAffiliateUrl(product.affiliateUrl);

      if (url) {
        action.href = url;
        action.target = "_blank";
        action.rel = "sponsored nofollow noopener noreferrer";

        action.addEventListener("click", () => {
          trackAffiliateClick(product);
        });
      } else {
        action.href = "#";
        action.setAttribute("aria-disabled", "true");
        action.textContent = "Link coming soon";

        action.addEventListener("click", event => {
          event.preventDefault();
        });
      }

      info.appendChild(action);
    }

    // Partner product: WhatsApp enquiry + optional partner page button.
    else if (type === "partner") {
      const action = document.createElement("a");
      action.className = "product-action partner-action";

      action.textContent =
        product.buttonLabel || "Enquire & Order on WhatsApp";

      if (product.active === false) {
        action.href = "#";
        action.textContent = "Coming soon";
        action.setAttribute("aria-disabled", "true");

        action.addEventListener("click", event => {
          event.preventDefault();
        });
      } else {
        const message = [
          "Hi Sarvyanta, I'd like to enquire about a partner product.",
          "",
          "Product: " + safeText(product.name),
          "Product ID: " + safeText(product.id),
          "Quantity: ",
          "",
          "Please confirm the price, availability, delivery and payment details."
        ].join("\n");

        action.href =
          "https://wa.me/" +
          WHATSAPP_NUMBER +
          "?text=" +
          encodeURIComponent(message);

        action.target = "_blank";
        action.rel = "noopener noreferrer";

        action.addEventListener("click", () => {
          trackMarketEvent("whatsapp_enquiry", product, {
            enquiry_type: "partner_product",
            contact_method: "whatsapp"
          });
        });
      }

      info.appendChild(action);

      // Optional: explore more products from the same partner.
      if (
        product.active !== false &&
        typeof product.partnerPageUrl === "string" &&
        product.partnerPageUrl.trim()
      ) {
        try {
          const partnerUrl = new URL(product.partnerPageUrl);

          if (partnerUrl.protocol === "https:") {
            const exploreButton = document.createElement("a");

            exploreButton.className =
              "product-action partner-explore-action";

            exploreButton.textContent =
              "Explore Other Products ↗";

            exploreButton.href = partnerUrl.href;
            exploreButton.target = "_blank";
            exploreButton.rel = "noopener noreferrer";

            exploreButton.addEventListener("click", () => {
              trackMarketEvent("partner_page_click", product, {
                destination_url: partnerUrl.href
              });
            });

            info.appendChild(exploreButton);
          }
        } catch (_) {
          // Ignore an invalid partner page URL.
        }
      }
    }

    // Sarvyanta-owned product.
    else {
      const action = document.createElement("a");
      action.className = "product-action own-action";

      if (product.active === false) {
        action.href = "#";
        action.textContent = "Coming soon";
        action.setAttribute("aria-disabled", "true");

        action.addEventListener("click", event => {
          event.preventDefault();
        });
      } else if (product.orderUrl) {
        action.textContent =
          product.buttonLabel || "Enquire / Order";

        action.href = product.orderUrl;
        action.target = "_blank";
        action.rel = "noopener noreferrer";

        action.addEventListener("click", () => {
          trackMarketEvent("own_product_click", product, {
            destination_url: product.orderUrl
          });
        });
      } else {
        action.href = "#";
        action.textContent = "More details soon";
        action.setAttribute("aria-disabled", "true");

        action.addEventListener("click", event => {
          event.preventDefault();
        });
      }

      info.appendChild(action);
    }

    card.append(imageWrap, info);

    return card;
  }

  // ========================================
  // CATEGORY FILTERS
  // ========================================

  function buildCategories() {
    if (!categoryContainer) return;

    const categories = [
      ...new Set(
        products
          .filter(product => product.active !== false)
          .map(product => product.category || "general")
      )
    ].sort((a, b) => titleCase(a).localeCompare(titleCase(b)));

    categoryContainer.replaceChildren();

    categoryContainer.appendChild(
      makeCategoryButton("all", "All products")
    );

    categories.forEach(category => {
      categoryContainer.appendChild(
        makeCategoryButton(category, titleCase(category))
      );
    });

    updateCategoryButtons();
  }

  function makeCategoryButton(value, label) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "category-chip";
    button.dataset.category = value;
    button.textContent = label;
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", () => {
      selectedCategory = value;
      updateCategoryButtons();
      renderProducts();

      trackMarketEvent("select_category", null, {
        selected_category: value,
        category_label: label
      });
    });

    return button;
  }

  function updateCategoryButtons() {
    if (!categoryContainer) return;

    categoryContainer
      .querySelectorAll("button[data-category]")
      .forEach(button => {
        const selected =
          button.dataset.category === selectedCategory;

        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
  }

  // ========================================
  // RENDER PRODUCTS
  // ========================================

  function renderProducts() {
    const query = searchTerm.trim().toLowerCase();

    const visible = products.filter(product => {
      if (product.active === false) return false;

      const categoryMatches =
        selectedCategory === "all" ||
        (product.category || "general") === selectedCategory;

      const searchable = [
        product.name,
        product.description,
        product.category,
        product.type
      ]
        .map(value => safeText(value))
        .join(" ")
        .toLowerCase();

      return categoryMatches && (!query || searchable.includes(query));
    });

    if (sortSelect && sortSelect.value === "name") {
      visible.sort((a, b) =>
        safeText(a.name).localeCompare(safeText(b.name))
      );
    } else {
      visible.sort(
        (a, b) =>
          Number(Boolean(b.featured)) -
          Number(Boolean(a.featured))
      );
    }

    Object.values(grids).forEach(grid => {
      if (grid) grid.replaceChildren();
    });

    const grouped = {
      affiliate: new Map(),
      partner: new Map(),
      sarvyanta: new Map()
    };

    visible.forEach(product => {
      const type = productType(product);
      const category = product.category || "general";

      if (!grouped[type].has(category)) {
        grouped[type].set(category, []);
      }

      grouped[type].get(category).push(product);
    });

    Object.entries(grouped).forEach(([type, categories]) => {
      const grid = grids[type];
      if (!grid) return;

      const section = grid.closest(".market-product-section");

      const sortedCategories = [...categories.entries()].sort(
        ([a], [b]) => titleCase(a).localeCompare(titleCase(b))
      );

      sortedCategories.forEach(([category, categoryProducts]) => {
        const row = document.createElement("div");
        row.className = "market-category-row";

        const heading = document.createElement("h3");
        heading.className = "market-category-title";
        heading.textContent = titleCase(category);

        const track = document.createElement("div");
        track.className = "market-category-track";
        track.setAttribute(
          "aria-label",
          titleCase(category) + " products"
        );
        track.setAttribute("tabindex", "0");
        track.setAttribute("role", "region");

        categoryProducts.forEach(product => {
          track.appendChild(createProductCard(product));
        });

        row.append(heading, track);
        grid.appendChild(row);
      });

      if (section) {
        section.hidden = categories.size === 0;
      }
    });

    if (resultCount) {
      resultCount.textContent =
        `${visible.length} ${visible.length === 1 ? "product" : "products"}`;
    }

    if (emptyState) {
      emptyState.hidden = visible.length !== 0;
    }

    if (visible.length === 0) {
      Object.values(grids).forEach(grid => {
        if (!grid) return;

        const section = grid.closest(".market-product-section");
        if (section) section.hidden = true;
      });
    }
  }

  // ========================================
  // CLEAR FILTERS
  // ========================================

  function clearFilters() {
    if (searchInput) searchInput.value = "";

    if (searchTrackingTimeout) {
      clearTimeout(searchTrackingTimeout);
      searchTrackingTimeout = null;
    }

    selectedCategory = "all";
    searchTerm = "";
    lastTrackedSearch = "";

    if (sortSelect) sortSelect.value = "featured";

    updateCategoryButtons();
    renderProducts();
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchTerm = searchInput.value;
      renderProducts();

      if (searchTrackingTimeout) {
        clearTimeout(searchTrackingTimeout);
      }

      const query = searchTerm.trim();

      if (query.length < 2) return;

      searchTrackingTimeout = setTimeout(() => {
        const normalizedQuery = query.toLowerCase();

        if (normalizedQuery === lastTrackedSearch) return;

        lastTrackedSearch = normalizedQuery;

        trackMarketEvent("search", null, {
          search_term: query,
          selected_category: selectedCategory
        });
      }, 700);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      renderProducts();

      trackMarketEvent("market_sort", null, {
        sort_option: sortSelect.value
      });
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      clearFilters();

      trackMarketEvent("clear_market_filters", null, {
        page_type: "market"
      });
    });
  }

  // ========================================
  // PRODUCT DETAILS VIEWER + IMAGE LIGHTBOX
  // ========================================

  let lightbox = null;
  let productViewerContent = null;
  let viewerCounter = null;

  let imageLightbox = null;
  let zoomedImage = null;

  let currentCards = [];
  let currentCardIndex = 0;

  let previousBodyOverflow = "";
  let previouslyFocusedElement = null;
  let previouslyFocusedImageControl = null;

  let touchStartX = 0;
  let touchStartY = 0;

  function addViewerStyles() {
    if (document.getElementById("market-product-viewer-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "market-product-viewer-styles";

    style.textContent = `
      /* Product details overlay */
      .market-image-lightbox {
        position: fixed;
        inset: 0;
        z-index: 9998;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
        overflow-y: auto;
        background: rgba(10, 18, 32, 0.82);
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
      }

      .market-image-lightbox.is-open {
        display: flex;
      }

      .market-image-lightbox *,
      .market-image-lightbox *::before,
      .market-image-lightbox *::after,
      .market-image-zoom-overlay *,
      .market-image-zoom-overlay *::before,
      .market-image-zoom-overlay *::after {
        box-sizing: border-box;
      }

      .market-lightbox-content {
        position: relative;
        flex: 0 0 auto;
        width: min(100%, 820px);
        max-height: none;
        margin: auto;
        padding: 58px 54px 20px;
        overflow: visible;
        border-radius: 20px;
        background: #ffffff;
        color: #172337;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
      }

      .market-lightbox-close {
        position: absolute;
        top: 10px;
        right: 12px;
        z-index: 8;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 50%;
        background: #edf1f7;
        color: #172337;
        font-size: 30px;
        line-height: 1;
        cursor: pointer;
      }

      .market-lightbox-close:hover {
        background: #dce5f1;
      }

      .market-lightbox-product-container {
        min-width: 0;
        touch-action: pan-y;
      }

      .market-lightbox-product {
        display: block;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        margin: 0;
        overflow: hidden;
        border-radius: 14px;
      }

      .market-lightbox-product .product-image-wrap {
        position: relative;
        width: 100%;
        height: auto;
        min-height: 0;
        max-height: none;
        overflow: hidden;
      }

      .market-lightbox-product .product-image {
        display: block;
        width: 100%;
        height: auto;
        max-height: 48vh;
        min-height: 180px;
        object-fit: contain;
        cursor: zoom-in;
      }

      .market-lightbox-product .product-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
      }

      .market-lightbox-product .product-info {
        width: 100%;
        padding: 18px;
      }

      .market-lightbox-product .product-title,
      .market-lightbox-product .product-description {
        overflow-wrap: anywhere;
      }

      .market-lightbox-product .product-description {
        white-space: pre-wrap;
      }

      .market-lightbox-product .product-action {
        display: inline-block;
        max-width: 100%;
        overflow-wrap: anywhere;
      }

      /* Image enlargement button */
      .market-enlarge-image {
        position: absolute;
        right: 10px;
        bottom: 10px;
        z-index: 5;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 38px;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.65);
        border-radius: 999px;
        background: rgba(18, 29, 47, 0.88);
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        cursor: zoom-in;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
      }

      .market-enlarge-image:hover {
        background: #172337;
      }

      /* Left and right product navigation */
      .market-lightbox-nav {
        position: absolute;
        top: 50%;
        z-index: 7;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 52px;
        padding: 0;
        transform: translateY(-50%);
        border: 0;
        border-radius: 12px;
        background: #172337;
        color: #ffffff;
        font-size: 29px;
        line-height: 1;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
      }

      .market-lightbox-nav:hover {
        background: #24466f;
      }

      .market-lightbox-nav:focus-visible,
      .market-lightbox-close:focus-visible,
      .market-enlarge-image:focus-visible {
        outline: 3px solid #3c91ff;
        outline-offset: 3px;
      }

      .market-lightbox-prev {
        left: 5px;
      }

      .market-lightbox-next {
        right: 5px;
      }

      .market-lightbox-caption {
        margin-top: 12px;
        text-align: center;
        font-size: 13px;
        color: #5c6b80;
      }

      .market-lightbox-counter {
        margin-top: 8px;
        text-align: center;
        font-size: 12px;
        color: #6b7789;
      }

      /* Separate enlarged-image overlay */
      .market-image-zoom-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(4, 9, 18, 0.96);
        touch-action: manipulation;
      }

      .market-image-zoom-overlay.is-open {
        display: flex;
      }

      .market-zoomed-image {
        display: block;
        max-width: 96vw;
        max-height: 88vh;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 8px;
        cursor: zoom-out;
      }

      .market-image-zoom-close {
        position: absolute;
        top: max(14px, env(safe-area-inset-top));
        right: max(14px, env(safe-area-inset-right));
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 46px;
        height: 46px;
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        font-size: 31px;
        line-height: 1;
        cursor: pointer;
      }

      .market-image-zoom-close:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .market-image-zoom-caption {
        position: absolute;
        right: 60px;
        bottom: max(14px, env(safe-area-inset-bottom));
        left: 60px;
        color: #ffffff;
        font-size: 13px;
        text-align: center;
        overflow-wrap: anywhere;
      }

      @media (max-width: 600px) {
        .market-image-lightbox {
          align-items: center;
          padding: 10px;
        }

        .market-lightbox-content {
          width: 100%;
          padding: 54px 42px 16px;
          border-radius: 16px;
        }

        .market-lightbox-product .product-info {
          padding: 13px;
        }

        .market-lightbox-product .product-image {
          max-height: 38vh;
          min-height: 130px;
        }

        .market-lightbox-nav {
          width: 34px;
          height: 44px;
          border-radius: 10px;
          font-size: 25px;
        }

        .market-lightbox-prev {
          left: 3px;
        }

        .market-lightbox-next {
          right: 3px;
        }

        .market-enlarge-image {
          right: 7px;
          bottom: 7px;
          min-height: 34px;
          padding: 7px 9px;
          font-size: 12px;
        }

        .market-image-zoom-overlay {
          padding: 12px;
        }

        .market-zoomed-image {
          max-width: 98vw;
          max-height: 84vh;
        }
      }

      @media (prefers-reduced-motion: no-preference) {
        .market-image-lightbox.is-open,
        .market-image-zoom-overlay.is-open {
          animation: market-overlay-in 160ms ease-out;
        }

        @keyframes market-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ========================================
  // CREATE PRODUCT DETAILS VIEWER
  // ========================================

  function createLightbox() {
    if (lightbox) return;

    addViewerStyles();

    lightbox = document.createElement("div");
    lightbox.className = "market-image-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Product details");

    lightbox.innerHTML = `
      <div class="market-lightbox-content">
        <button
          type="button"
          class="market-lightbox-close"
          aria-label="Close product details"
        >&times;</button>

        <button
          type="button"
          class="market-lightbox-nav market-lightbox-prev"
          aria-label="Previous product"
          title="Previous product"
        >&#8249;</button>

        <div
          class="market-lightbox-product-container"
          aria-live="polite"
        ></div>

        <button
          type="button"
          class="market-lightbox-nav market-lightbox-next"
          aria-label="Next product"
          title="Next product"
        >&#8250;</button>

        <div class="market-lightbox-caption"></div>
        <div class="market-lightbox-counter"></div>
      </div>
    `;

    document.body.appendChild(lightbox);

    productViewerContent = lightbox.querySelector(
      ".market-lightbox-product-container"
    );

    viewerCounter = lightbox.querySelector(
      ".market-lightbox-counter"
    );

    lightbox
      .querySelector(".market-lightbox-close")
      .addEventListener("click", closeLightbox);

    lightbox
      .querySelector(".market-lightbox-prev")
      .addEventListener("click", showPreviousProduct);

    lightbox
      .querySelector(".market-lightbox-next")
      .addEventListener("click", showNextProduct);

    lightbox.addEventListener("click", event => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    // Click or tap the product image to enlarge it.
    productViewerContent.addEventListener("click", event => {
      const enlargeButton = event.target.closest(".market-enlarge-image");

      const image = event.target.closest(
        ".market-lightbox-product .product-image"
      );

      if (enlargeButton || image) {
        event.preventDefault();
        event.stopPropagation();

        const targetImage = image ||
          productViewerContent.querySelector(
            ".market-lightbox-product .product-image"
          );

        if (targetImage) {
          openImageLightbox(targetImage);
        }
      }
    });

    // Swipe horizontally to navigate between products.
    lightbox.addEventListener("touchstart", event => {
      if (event.touches.length !== 1) return;

      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener("touchend", event => {
      if (!lightbox.classList.contains("is-open")) return;
      if (imageLightbox?.classList.contains("is-open")) return;
      if (!event.changedTouches.length) return;

      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;

      const deltaX = endX - touchStartX;
      const deltaY = endY - touchStartY;

      // Avoid interpreting vertical scrolling as a product swipe.
      if (
        Math.abs(deltaX) > 55 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.25
      ) {
        if (deltaX < 0) {
          showNextProduct();
        } else {
          showPreviousProduct();
        }
      }
    }, { passive: true });
  }

  // ========================================
  // CREATE IMAGE ENLARGEMENT LIGHTBOX
  // ========================================

  function createImageLightbox() {
    if (imageLightbox) return;

    addViewerStyles();

    imageLightbox = document.createElement("div");
    imageLightbox.className = "market-image-zoom-overlay";
    imageLightbox.setAttribute("role", "dialog");
    imageLightbox.setAttribute("aria-modal", "true");
    imageLightbox.setAttribute("aria-label", "Enlarged product image");

    imageLightbox.innerHTML = `
      <button
        type="button"
        class="market-image-zoom-close"
        aria-label="Close enlarged image"
      >&times;</button>

      <img class="market-zoomed-image" alt="" />

      <div class="market-image-zoom-caption"></div>
    `;

    document.body.appendChild(imageLightbox);

    zoomedImage = imageLightbox.querySelector(".market-zoomed-image");

    imageLightbox
      .querySelector(".market-image-zoom-close")
      .addEventListener("click", closeImageLightbox);

    imageLightbox.addEventListener("click", event => {
      if (
        event.target === imageLightbox ||
        event.target === zoomedImage
      ) {
        closeImageLightbox();
      }
    });
  }

  function openImageLightbox(sourceImage) {
    if (!sourceImage || !sourceImage.src) return;

    createImageLightbox();

    previouslyFocusedImageControl = document.activeElement;

    zoomedImage.src = sourceImage.currentSrc || sourceImage.src;
    zoomedImage.alt = sourceImage.alt || "Enlarged product image";

    const caption = imageLightbox.querySelector(
      ".market-image-zoom-caption"
    );

    caption.textContent = sourceImage.alt || "";

    imageLightbox.classList.add("is-open");

    imageLightbox
      .querySelector(".market-image-zoom-close")
      .focus();
  }

  function closeImageLightbox() {
    if (!imageLightbox) return;

    imageLightbox.classList.remove("is-open");

    zoomedImage.removeAttribute("src");
    zoomedImage.alt = "";

    if (
      previouslyFocusedImageControl &&
      previouslyFocusedImageControl.isConnected
    ) {
      previouslyFocusedImageControl.focus();
    }

    previouslyFocusedImageControl = null;
  }

  // ========================================
  // FIND VISIBLE PRODUCT CARDS
  // ========================================

  function getVisibleProductCards() {
    return Array.from(document.querySelectorAll(".product-card"))
      .filter(card => {
        if (!card.isConnected) return false;

        if (card.closest(".market-image-lightbox")) return false;
        if (card.closest("[hidden]")) return false;

        return true;
      });
  }

  // ========================================
  // OPEN PRODUCT DETAILS
  // ========================================

  function openProductViewer(card) {
    if (!card) return;

    createLightbox();

    currentCards = getVisibleProductCards();
    currentCardIndex = currentCards.indexOf(card);

    if (currentCardIndex < 0) return;

    previouslyFocusedElement = card;
    previousBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    displayCurrentProduct();

    lightbox.classList.add("is-open");

    const product = products.find(item =>
      safeText(item.id) === card.dataset.productId
    );

    if (product) {
      trackMarketEvent("view_item", product, {
        viewer: "product_details"
      });
    }

    lightbox
      .querySelector(".market-lightbox-close")
      .focus();
  }

  // ========================================
  // DISPLAY CURRENT PRODUCT
  // ========================================

  function displayCurrentProduct() {
    if (!currentCards.length) return;

    const originalCard = currentCards[currentCardIndex];

    if (!originalCard || !originalCard.isConnected) return;

    const productClone = originalCard.cloneNode(true);

    productClone.classList.add("market-lightbox-product");
    productClone.removeAttribute("tabindex");
    productClone.removeAttribute("aria-label");
    productClone.removeAttribute("id");

    // Add an explicit image enlargement control.
    const imageWrap = productClone.querySelector(".product-image-wrap");
    const productImage = productClone.querySelector(".product-image");

    if (imageWrap && productImage) {
      const enlargeButton = document.createElement("button");

      enlargeButton.type = "button";
      enlargeButton.className = "market-enlarge-image";
      enlargeButton.setAttribute(
        "aria-label",
        "Enlarge image of " +
          safeText(productImage.alt || "product")
      );
      enlargeButton.title = "Enlarge product image";
      enlargeButton.innerHTML = "<span aria-hidden='true'>⤢</span> Enlarge image";

      imageWrap.appendChild(enlargeButton);
    }

    productViewerContent.replaceChildren(productClone);

    // Restore affiliate click tracking on the cloned Amazon link.
    // Also restore partner and own-product tracking in the viewer.
    const originalAction = originalCard.querySelector(".product-action");
    const clonedAction = productClone.querySelector(".product-action");

    if (
      originalAction &&
      clonedAction &&
      !clonedAction.hasAttribute("aria-disabled")
    ) {
      const product = products.find(item =>
        safeText(item.id) === originalCard.dataset.productId
      );

      if (product) {
        if (
          productType(product) === "affiliate" &&
          validAffiliateUrl(product.affiliateUrl)
        ) {
          clonedAction.addEventListener("click", () => {
            trackAffiliateClick(product);
          });
        } else if (
          productType(product) === "partner" &&
          product.active !== false
        ) {
          clonedAction.addEventListener("click", () => {
            trackMarketEvent("whatsapp_enquiry", product, {
              enquiry_type: "partner_product",
              contact_method: "whatsapp",
              viewer: "product_details"
            });
          });
        } else if (
          productType(product) === "sarvyanta" &&
          product.active !== false &&
          product.orderUrl
        ) {
          clonedAction.addEventListener("click", () => {
            trackMarketEvent("own_product_click", product, {
              destination_url: product.orderUrl,
              viewer: "product_details"
            });
          });
        }
      }
    }

    // Track partner page button clicks in the cloned viewer.
    const originalExploreButton = originalCard.querySelector(
      ".partner-explore-action"
    );
    const clonedExploreButton = productClone.querySelector(
      ".partner-explore-action"
    );

    if (originalExploreButton && clonedExploreButton) {
      const product = products.find(item =>
        safeText(item.id) === originalCard.dataset.productId
      );

      if (product) {
        clonedExploreButton.addEventListener("click", () => {
          trackMarketEvent("partner_page_click", product, {
            destination_url: clonedExploreButton.href,
            viewer: "product_details"
          });
        });
      }
    }

    const title = productClone.querySelector(".product-title");

    const caption = lightbox.querySelector(
      ".market-lightbox-caption"
    );

    caption.textContent = title
      ? title.textContent.trim()
      : "Product details";

    viewerCounter.textContent =
      `${currentCardIndex + 1} of ${currentCards.length}`;

    const multipleProducts = currentCards.length > 1;

    lightbox.querySelector(".market-lightbox-prev").hidden =
      !multipleProducts;

    lightbox.querySelector(".market-lightbox-next").hidden =
      !multipleProducts;

    // Start at the top when changing products.
    lightbox.scrollTop = 0;
  }

  // ========================================
  // HORIZONTAL PRODUCT NAVIGATION
  // ========================================

  function showPreviousProduct() {
    if (currentCards.length < 2) return;

    currentCardIndex =
      (currentCardIndex - 1 + currentCards.length) %
      currentCards.length;

    displayCurrentProduct();

    const card = currentCards[currentCardIndex];
    const product = products.find(item =>
      safeText(item.id) === card?.dataset.productId
    );

    if (product) {
      trackMarketEvent("view_item", product, {
        viewer: "product_details",
        navigation: "previous"
      });
    }
  }

  function showNextProduct() {
    if (currentCards.length < 2) return;

    currentCardIndex =
      (currentCardIndex + 1) % currentCards.length;

    displayCurrentProduct();

    const card = currentCards[currentCardIndex];
    const product = products.find(item =>
      safeText(item.id) === card?.dataset.productId
    );

    if (product) {
      trackMarketEvent("view_item", product, {
        viewer: "product_details",
        navigation: "next"
      });
    }
  }

  // ========================================
  // CLOSE PRODUCT DETAILS
  // ========================================

  function closeLightbox() {
    if (!lightbox) return;

    closeImageLightbox();

    lightbox.classList.remove("is-open");
    productViewerContent.replaceChildren();

    document.body.style.overflow = previousBodyOverflow;

    if (
      previouslyFocusedElement &&
      previouslyFocusedElement.isConnected
    ) {
      previouslyFocusedElement.focus();
    }

    previouslyFocusedElement = null;
    currentCards = [];
    currentCardIndex = 0;
  }

  // ========================================
  // PRODUCT CARD CLICK HANDLING
  // ========================================

  document.addEventListener("click", event => {
    const card = event.target.closest(".product-card");

    if (!card) return;

    // Let links and buttons perform their normal actions.
    if (event.target.closest("a, button")) return;

    // Don't open another viewer from inside the current viewer.
    if (event.target.closest(".market-image-lightbox")) return;

    event.preventDefault();
    openProductViewer(card);
  });

  // ========================================
  // KEYBOARD SUPPORT
  // ========================================

  document.addEventListener("keydown", event => {
    // The image lightbox has priority over the product viewer.
    if (imageLightbox?.classList.contains("is-open")) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeImageLightbox();
      }

      return;
    }

    // Open a focused product card with Enter or Space.
    const card = event.target.closest?.(
      ".product-card:not(.market-lightbox-product)"
    );

    if (
      card &&
      !event.target.closest("a, button") &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      openProductViewer(card);
      return;
    }

    if (!lightbox || !lightbox.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPreviousProduct();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showNextProduct();
    }
  });

  // ========================================
  // LOAD PRODUCT CATALOGUE
  // ========================================

  fetch("products.json", { cache: "no-cache" })
    .then(response => {
      if (!response.ok) {
        throw new Error("Could not load products.json");
      }

      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) {
        throw new Error("Product catalogue must be a JSON array");
      }

      products = data.filter(
        product =>
          product &&
          typeof product === "object" &&
          product.name
      );

      buildCategories();
      renderProducts();

      trackMarketEvent("market_catalogue_loaded", null, {
        product_count: products.filter(
          product => product.active !== false
        ).length
      });
    })
    .catch(error => {
      console.error("Sarvyanta Market catalogue error:", error);

      Object.values(grids).forEach(grid => {
        if (!grid) return;

        grid.replaceChildren();

        const message = document.createElement("div");
        message.className = "loading-card";
        message.textContent =
          "We're updating the market. Please check back soon.";

        grid.appendChild(message);
      });

      if (resultCount) {
        resultCount.textContent =
          "Products temporarily unavailable";
      }

      trackMarketEvent("market_catalogue_error", null, {
        error_message: safeText(error.message || "Unknown error")
      });
    });
})();
