
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

  // ----------------------------------------
  // BASIC PAGE SETUP
  // ----------------------------------------

  if (year) {
    year.textContent = new Date().getFullYear();
  }

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

  // ----------------------------------------
  // AMAZON AFFILIATE URL VALIDATION
  // ----------------------------------------

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
    if (typeof window.gtag === "function") {
      window.gtag("event", "affiliate_click", {
        product_id: product.id || "unknown",
        product_name: product.name || "unknown",
        product_category: product.category || "uncategorized",
        affiliate_program: "amazon"
      });
    }
  }

  // ----------------------------------------
  // PRODUCT IMAGE PLACEHOLDER
  // ----------------------------------------

  function addPlaceholder(imageWrap) {
    if (imageWrap.querySelector(".product-placeholder")) return;

    const placeholder = document.createElement("div");
    placeholder.className = "product-placeholder";
    placeholder.textContent = "✦";
    placeholder.setAttribute("aria-hidden", "true");

    imageWrap.appendChild(placeholder);
  }

  // ----------------------------------------
  // CREATE PRODUCT CARD
  // ----------------------------------------

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

    // Product image area.
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

    // Product price.
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

    // --------------------------------------
    // AMAZON AFFILIATE PRODUCT
    // --------------------------------------

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

    // --------------------------------------
    // PARTNER PRODUCT — WHATSAPP ENQUIRY
    // --------------------------------------

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
      }

      info.appendChild(action);
    }

    // --------------------------------------
    // SARVYANTA-OWNED PRODUCT
    // --------------------------------------

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

  // ----------------------------------------
  // CATEGORY FILTERS
  // ----------------------------------------

  function buildCategories() {
    if (!categoryContainer) return;

    const categories = [
      ...new Set(
        products
          .filter(product => product.active !== false)
          .map(product => product.category || "general")
      )
    ].sort((a, b) =>
      titleCase(a).localeCompare(titleCase(b))
    );

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

  // ----------------------------------------
  // RENDER PRODUCTS
  // ----------------------------------------

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

      return (
        categoryMatches &&
        (!query || searchable.includes(query))
      );
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

    // Clear existing product rows.
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

    // Create a horizontal product row for each category.
    Object.entries(grouped).forEach(([type, categories]) => {
      const grid = grids[type];
      if (!grid) return;

      const section = grid.closest(".market-product-section");

      const sortedCategories = [...categories.entries()].sort(
        ([a], [b]) =>
          titleCase(a).localeCompare(titleCase(b))
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

  // ----------------------------------------
  // CLEAR SEARCH AND FILTERS
  // ----------------------------------------

  function clearFilters() {
    if (searchInput) searchInput.value = "";

    selectedCategory = "all";
    searchTerm = "";

    if (sortSelect) sortSelect.value = "featured";

    updateCategoryButtons();
    renderProducts();
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchTerm = searchInput.value;
      renderProducts();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", renderProducts);
  }

  if (clearButton) {
    clearButton.addEventListener("click", clearFilters);
  }

  // ========================================
  // FULL PRODUCT VIEWER
  // ========================================

  let lightbox = null;
  let productViewerContent = null;
  let viewerCounter = null;

  let currentCards = [];
  let currentCardIndex = 0;
  let previousBodyOverflow = "";
  let previouslyFocusedElement = null;

  // Add viewer-specific CSS without requiring changes
  // to the existing stylesheet.
  function addViewerStyles() {
    if (document.getElementById("market-product-viewer-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "market-product-viewer-styles";

    style.textContent = `
      .market-image-lightbox {
        box-sizing: border-box;
        padding: 18px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .market-image-lightbox *,
      .market-image-lightbox *::before,
      .market-image-lightbox *::after {
        box-sizing: border-box;
      }

      .market-lightbox-content {
        position: relative;
        width: min(100%, 680px);
        max-height: none;
        margin: auto;
        padding: 58px 20px 20px;
        overflow: visible;
      }

      .market-lightbox-close {
        position: absolute;
        top: 10px;
        right: 12px;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 50%;
        font-size: 30px;
        line-height: 1;
        cursor: pointer;
      }

      .market-lightbox-product {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        margin: 0;
        overflow: hidden;
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
        cursor: default;
      }

      .market-lightbox-product .product-placeholder {
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .market-lightbox-product .product-info {
        width: 100%;
        padding: 18px;
      }

      .market-lightbox-product .product-title {
        overflow-wrap: anywhere;
      }

      .market-lightbox-product .product-description {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .market-lightbox-product .product-action {
        display: inline-block;
        max-width: 100%;
        overflow-wrap: anywhere;
      }

      .market-lightbox-caption {
        margin-top: 12px;
        text-align: center;
        font-size: 13px;
      }

      .market-lightbox-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 16px;
      }

      .market-lightbox-controls button {
        cursor: pointer;
      }

      .market-lightbox-counter {
        text-align: center;
        font-size: 13px;
        white-space: nowrap;
      }

      @media (max-width: 480px) {
        .market-image-lightbox {
          padding: 10px;
        }

        .market-lightbox-content {
          padding: 54px 10px 14px;
        }

        .market-lightbox-product .product-info {
          padding: 14px;
        }

        .market-lightbox-product .product-image {
          max-height: 40vh;
        }

        .market-lightbox-controls {
          gap: 6px;
        }

        .market-lightbox-controls button {
          padding: 9px 8px;
          font-size: 13px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createLightbox() {
    if (lightbox) return;

    addViewerStyles();

    lightbox = document.createElement("div");
    lightbox.className = "market-image-lightbox";

    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Product details viewer");

    lightbox.innerHTML = `
      <div class="market-lightbox-content">
        <button
          type="button"
          class="market-lightbox-close"
          aria-label="Close product viewer"
        >&times;</button>

        <div
          class="market-lightbox-product-container"
          aria-live="polite"
        ></div>

        <div class="market-lightbox-caption"></div>

        <div class="market-lightbox-controls">
          <button
            type="button"
            class="market-lightbox-prev"
            aria-label="Previous product"
          >&#8592; Previous</button>

          <span class="market-lightbox-counter"></span>

          <button
            type="button"
            class="market-lightbox-next"
            aria-label="Next product"
          >Next &#8594;</button>
        </div>
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
  }

  // Collect the products currently visible after filtering.
  // Hidden sections and cards are excluded.
  function getVisibleProductCards() {
    return Array.from(document.querySelectorAll(".product-card"))
      .filter(card => {
        if (!card.isConnected) return false;

        if (card.closest(".market-image-lightbox")) {
          return false;
        }

        if (card.closest("[hidden]")) {
          return false;
        }

        return true;
      });
  }

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

    lightbox
      .querySelector(".market-lightbox-close")
      .focus();
  }

  function displayCurrentProduct() {
    if (!currentCards.length) return;

    const originalCard = currentCards[currentCardIndex];

    if (!originalCard || !originalCard.isConnected) return;

    // Clone the entire card so the viewer shows the image,
    // badge, category, title, description, price and action.
    // The original card remains untouched.
    const productClone = originalCard.cloneNode(true);

    productClone.classList.add("market-lightbox-product");
    productClone.removeAttribute("tabindex");
    productClone.removeAttribute("aria-label");

    // Remove IDs from the clone if any are added in the future.
    productClone.removeAttribute("id");

    productViewerContent.replaceChildren(productClone);

    // The cloned purchase links retain their URLs, but DOM
    // event listeners are not copied by cloneNode(). Restore
    // Amazon click tracking for the cloned action.
    const originalAction = originalCard.querySelector(
      ".product-action"
    );

    const clonedAction = productClone.querySelector(
      ".product-action"
    );

    if (
      originalAction &&
      clonedAction &&
      !clonedAction.hasAttribute("aria-disabled") &&
      productClone.classList.contains("product-card")
    ) {
      const originalIndex = currentCardIndex;

      if (
        originalAction.href &&
        /(^|\.)amazon\.(in|com)$|(^|\.)amzn\.to$/i.test(
          (() => {
            try {
              return new URL(originalAction.href).hostname;
            } catch (_) {
              return "";
            }
          })()
        )
      ) {
        clonedAction.addEventListener("click", () => {
          const original = currentCards[originalIndex];
          if (!original) return;

          const product = products.find(item =>
            safeText(item.id) === original.dataset.productId
          );

          if (product) {
            trackAffiliateClick(product);
          }
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

    const previousButton = lightbox.querySelector(
      ".market-lightbox-prev"
    );

    const nextButton = lightbox.querySelector(
      ".market-lightbox-next"
    );

    const multipleProducts = currentCards.length > 1;

    previousButton.hidden = !multipleProducts;
    nextButton.hidden = !multipleProducts;

    // Reset scroll position when switching products.
    lightbox.scrollTop = 0;
  }

  function showPreviousProduct() {
    if (!currentCards.length) return;

    currentCardIndex =
      (currentCardIndex - 1 + currentCards.length) %
      currentCards.length;

    displayCurrentProduct();
  }

  function showNextProduct() {
    if (!currentCards.length) return;

    currentCardIndex =
      (currentCardIndex + 1) % currentCards.length;

    displayCurrentProduct();
  }

  function closeLightbox() {
    if (!lightbox) return;

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

  // ----------------------------------------
  // CLICK ANYWHERE ON A PRODUCT CARD
  // ----------------------------------------

  document.addEventListener("click", event => {
    const card = event.target.closest(".product-card");

    if (!card) return;

    // Let purchase links work normally.
    // Clicking a link must not open the product viewer.
    if (event.target.closest("a, button")) {
      return;
    }

    // Ignore clicks within the viewer itself.
    if (event.target.closest(".market-image-lightbox")) {
      return;
    }

    event.preventDefault();
    openProductViewer(card);
  });

  // ----------------------------------------
  // KEYBOARD SUPPORT
  // ----------------------------------------

  document.addEventListener("keydown", event => {
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

  // ----------------------------------------
  // LOAD PRODUCT CATALOGUE
  // ----------------------------------------

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
    });
})();
