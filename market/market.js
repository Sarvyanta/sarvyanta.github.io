
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

  // Confirm this is still the correct Sarvyanta WhatsApp number.
  const WHATSAPP_NUMBER = "917386406514";

  let products = [];
  let selectedCategory = "all";
  let searchTerm = "";

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
    } catch (_) {}

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

  function addPlaceholder(imageWrap) {
    const placeholder = document.createElement("div");
    placeholder.className = "product-placeholder";
    placeholder.textContent = "✦";
    placeholder.setAttribute("aria-hidden", "true");
    imageWrap.appendChild(placeholder);
  }

  function createProductCard(product) {
    const type = productType(product);

    const card = document.createElement("article");
    card.className = "product-card";

    if (type === "partner") {
      card.classList.add("partner-card");
    }

    const imageWrap = document.createElement("div");
    imageWrap.className = "product-image-wrap";

    if (product.imageUrl) {
      const img = document.createElement("img");
      img.className = "product-image";
      img.src = product.imageUrl;
      img.alt = safeText(product.imageAlt || product.name);
      img.loading = "lazy";

      img.onerror = () => {
        img.remove();
        addPlaceholder(imageWrap);
      };

      imageWrap.appendChild(img);
    } else {
      addPlaceholder(imageWrap);
    }

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

    if (
      product.price !== undefined &&
      product.price !== null &&
      product.price !== ""
    ) {
      const price = document.createElement("p");
      price.className = "product-price";
      price.textContent =
        safeText(product.currency || "₹") + safeText(product.price);

      const note = document.createElement("small");
      note.textContent = product.priceNote
        ? " " + safeText(product.priceNote)
        : " · Check current price";

      price.appendChild(note);
      info.appendChild(price);
    }

    // Amazon affiliate product
    if (type === "affiliate") {
      const action = document.createElement("a");
      action.className = "product-action";
      action.textContent = product.buttonLabel || "View on Amazon ↗";

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

    // Partner product — enquiries go to Sarvyanta WhatsApp
    else if (type === "partner") {
      const action = document.createElement("a");
      action.className = "product-action partner-action";
      action.textContent =
        product.buttonLabel || "Enquire & Order on WhatsApp";

      if (product.active === false) {
        action.textContent = "Coming soon";
        action.setAttribute("aria-disabled", "true");
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

    // Sarvyanta-owned product
    else {
      const action = document.createElement("a");
      action.className = "product-action own-action";

      if (product.active === false) {
        action.textContent = "Coming soon";
        action.setAttribute("aria-disabled", "true");
      } else if (product.orderUrl) {
        action.textContent = product.buttonLabel || "Enquire / Order";
        action.href = product.orderUrl;
        action.target = "_blank";
        action.rel = "noopener noreferrer";
      } else {
        action.textContent = "More details soon";
        action.setAttribute("aria-disabled", "true");
      }

      info.appendChild(action);
    }

    card.append(imageWrap, info);
    return card;
  }

  function buildCategories() {
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
    });

    return button;
  }

  function updateCategoryButtons() {
    categoryContainer
      .querySelectorAll("button[data-category]")
      .forEach(button => {
        const selected = button.dataset.category === selectedCategory;

        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
  }

  function renderProducts() {
    const query = searchTerm.trim().toLowerCase();

    // Apply active status, category filter and search.
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

    // Sort the complete filtered list before grouping it.
    if (sortSelect.value === "name") {
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

    // Clear the previous rows.
    Object.values(grids).forEach(grid => {
      grid.replaceChildren();
    });

    // Group products by market section and then by category.
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

    // Render one horizontal scrolling row for every non-empty category.
    Object.entries(grouped).forEach(([type, categories]) => {
      const grid = grids[type];
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

      // Hide the whole section when no products match.
      section.hidden = categories.size === 0;
    });

    resultCount.textContent =
      `${visible.length} ${visible.length === 1 ? "product" : "products"}`;

    emptyState.hidden = visible.length !== 0;

    if (visible.length === 0) {
      Object.values(grids).forEach(grid => {
        grid.closest(".market-product-section").hidden = true;
      });
    }
  }

  function clearFilters() {
    searchInput.value = "";
    selectedCategory = "all";
    searchTerm = "";
    sortSelect.value = "featured";

    updateCategoryButtons();
    renderProducts();
  }

  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value;
    renderProducts();
  });

  sortSelect.addEventListener("change", renderProducts);
  clearButton.addEventListener("click", clearFilters);

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
        grid.replaceChildren();

        const message = document.createElement("div");
        message.className = "loading-card";
        message.textContent =
          "We're updating the market. Please check back soon.";

        grid.appendChild(message);
      });

      resultCount.textContent = "Products temporarily unavailable";
    });
})();
/* ==========================================
   SARVYANTA MARKET - IMAGE LIGHTBOX
   Add this to the end of market.js
   ========================================== */

(function () {
  "use strict";

  let currentImages = [];
  let currentImageIndex = 0;
  let lightbox = null;
  let lightboxImage = null;
  let lightboxCaption = null;

  function createLightbox() {
    if (document.querySelector(".market-image-lightbox")) {
      lightbox = document.querySelector(".market-image-lightbox");
      lightboxImage = lightbox.querySelector(".market-lightbox-image");
      lightboxCaption = lightbox.querySelector(".market-lightbox-caption");
      return;
    }

    lightbox = document.createElement("div");
    lightbox.className = "market-image-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Product image viewer");

    lightbox.innerHTML = `
      <div class="market-lightbox-content">
        <button
          type="button"
          class="market-lightbox-close"
          aria-label="Close image viewer"
        >&times;</button>

        <img
          class="market-lightbox-image"
          src=""
          alt="Enlarged product image"
        >

        <div class="market-lightbox-caption"></div>

        <div class="market-lightbox-controls">
          <button type="button" class="market-lightbox-prev">
            &#8592; Previous
          </button>

          <button type="button" class="market-lightbox-next">
            Next &#8594;
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(lightbox);

    lightboxImage = lightbox.querySelector(".market-lightbox-image");
    lightboxCaption = lightbox.querySelector(".market-lightbox-caption");

    lightbox.querySelector(".market-lightbox-close")
      .addEventListener("click", closeLightbox);

    lightbox.querySelector(".market-lightbox-prev")
      .addEventListener("click", showPreviousImage);

    lightbox.querySelector(".market-lightbox-next")
      .addEventListener("click", showNextImage);

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (!lightbox.classList.contains("is-open")) return;

      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") showPreviousImage();
      if (event.key === "ArrowRight") showNextImage();
    });
  }

  function getProductImages() {
    return Array.from(document.querySelectorAll(".product-image"))
      .filter(function (img) {
        return img.src && !img.dataset.imageError;
      });
  }

  function openLightbox(img) {
    createLightbox();

    currentImages = getProductImages();
    currentImageIndex = currentImages.indexOf(img);

    if (currentImageIndex < 0) {
      currentImages.push(img);
      currentImageIndex = currentImages.length - 1;
    }

    displayCurrentImage();
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function displayCurrentImage() {
    if (!currentImages.length) return;

    const img = currentImages[currentImageIndex];

    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt || "Product image";

    const card = img.closest(".product-card");
    const title = card
      ? card.querySelector(".product-title, h3, h2")
      : null;

    lightboxCaption.textContent = title
      ? title.textContent.trim()
      : (img.alt || "Product image");

    const prevButton = lightbox.querySelector(".market-lightbox-prev");
    const nextButton = lightbox.querySelector(".market-lightbox-next");

    prevButton.style.display = currentImages.length > 1 ? "" : "none";
    nextButton.style.display = currentImages.length > 1 ? "" : "none";
  }

  function showPreviousImage() {
    if (!currentImages.length) return;

    currentImageIndex =
      (currentImageIndex - 1 + currentImages.length) % currentImages.length;

    displayCurrentImage();
  }

  function showNextImage() {
    if (!currentImages.length) return;

    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    displayCurrentImage();
  }

  function closeLightbox() {
    if (!lightbox) return;

    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    lightboxImage.src = "";
  }

  // Event delegation also supports product cards loaded dynamically.
  document.addEventListener("click", function (event) {
    const img = event.target.closest(".product-image");

    if (!img) return;

    event.preventDefault();
    openLightbox(img);
  });

  // Mark images that fail to load so they aren't included in navigation.
  document.addEventListener("error", function (event) {
    if (event.target && event.target.matches(".product-image")) {
      event.target.dataset.imageError = "true";
    }
  }, true);

})();
