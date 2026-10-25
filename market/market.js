(() => {
  "use strict";

  const grid = document.getElementById("product-grid");
  const categoryContainer = document.getElementById("categories");
  const searchInput = document.getElementById("product-search");
  const sortSelect = document.getElementById("product-sort");
  const resultCount = document.getElementById("result-count");
  const emptyState = document.getElementById("empty-state");
  const clearButton = document.getElementById("clear-filters");
  const year = document.getElementById("current-year");

  let products = [];
  let selectedCategory = "all";
  let searchTerm = "";

  if (year) year.textContent = new Date().getFullYear();

  const titleCase = (value) => String(value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const safeText = (value) => String(value ?? "");

  function trackAffiliateClick(product) {
    // Uses GA4 if gtag is already configured by the main site.
    // No personal data is sent in these event parameters.
    if (typeof window.gtag === "function") {
      window.gtag("event", "affiliate_click", {
        product_id: product.id || "unknown",
        product_name: product.name || "unknown",
        product_category: product.category || "uncategorized",
        affiliate_program: "amazon"
      });
    }
  }

  function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";

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
        const placeholder = document.createElement("div");
        placeholder.className = "product-placeholder";
        placeholder.textContent = "✦";
        placeholder.setAttribute("aria-hidden", "true");
        imageWrap.appendChild(placeholder);
      };
      imageWrap.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "product-placeholder";
      placeholder.textContent = "✦";
      placeholder.setAttribute("aria-hidden", "true");
      imageWrap.appendChild(placeholder);
    }

    const badge = document.createElement("span");
    badge.className = "product-badge";
    badge.textContent = product.type === "sarvyanta" ? "SARVYANTA PRODUCT" : "RECOMMENDED";
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

    if (product.price !== undefined && product.price !== null && product.price !== "") {
      const price = document.createElement("p");
      price.className = "product-price";
      price.textContent = safeText(product.currency || "₹") + safeText(product.price);
      const note = document.createElement("small");
      note.textContent = product.priceNote ? " " + safeText(product.priceNote) : " · Check current price";
      price.appendChild(note);
      info.appendChild(price);
    }

    if (product.type === "sarvyanta") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "product-action own-action";
      if (product.active === false) {
        action.textContent = "Coming soon";
        action.disabled = true;
      } else if (product.orderUrl) {
        action.textContent = product.buttonLabel || "Enquire / Order";
        action.addEventListener("click", () => window.open(product.orderUrl, "_blank", "noopener,noreferrer"));
      } else {
        action.textContent = "More details soon";
        action.disabled = true;
      }
      info.appendChild(action);
    } else {
      const action = document.createElement("a");
      action.className = "product-action";
      action.textContent = product.buttonLabel || "View at Amazon ↗";
      const url = validAffiliateUrl(product.affiliateUrl);
      if (url) {
        action.href = url;
        action.target = "_blank";
        action.rel = "sponsored nofollow noopener noreferrer";
        action.addEventListener("click", () => trackAffiliateClick(product));
      } else {
        action.href = "#";
        action.setAttribute("aria-disabled", "true");
        action.addEventListener("click", event => event.preventDefault());
        action.textContent = "Link coming soon";
        action.style.opacity = ".65";
      }
      info.appendChild(action);
    }

    card.append(imageWrap, info);
    return card;
  }

  function validAffiliateUrl(value) {
    if (!value || typeof value !== "string") return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") return null;
      // Accept Amazon domains and Amazon's short-link domain only.
      const host = url.hostname.toLowerCase();
      if (host === "amzn.to" || host === "amazon.in" || host.endsWith(".amazon.in") ||
          host === "amazon.com" || host.endsWith(".amazon.com")) return url.href;
    } catch (_) {}
    return null;
  }

  function buildCategories() {
    const categories = [...new Set(products
      .filter(product => product.active !== false)
      .map(product => product.category || "general"))].sort();

    categoryContainer.replaceChildren();
    const allButton = makeCategoryButton("all", "All products");
    categoryContainer.appendChild(allButton);

    categories.forEach(category => {
      categoryContainer.appendChild(makeCategoryButton(category, titleCase(category)));
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
    categoryContainer.querySelectorAll("button[data-category]").forEach(button => {
      const selected = button.dataset.category === selectedCategory;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderProducts() {
    const query = searchTerm.trim().toLowerCase();
    let visible = products.filter(product => {
      if (product.active === false) return false;
      const categoryMatches = selectedCategory === "all" || (product.category || "general") === selectedCategory;
      const searchable = [product.name, product.description, product.category, product.type].join(" ").toLowerCase();
      return categoryMatches && (!query || searchable.includes(query));
    });

    if (sortSelect.value === "name") {
      visible.sort((a, b) => safeText(a.name).localeCompare(safeText(b.name)));
    } else {
      visible.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }

    grid.replaceChildren();
    visible.forEach(product => grid.appendChild(createProductCard(product)));
    resultCount.textContent = `${visible.length} ${visible.length === 1 ? "product" : "products"}`;
    emptyState.hidden = visible.length !== 0;
    grid.hidden = visible.length === 0;
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
      if (!response.ok) throw new Error("Could not load products.json");
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) throw new Error("Product catalogue must be a JSON array");
      products = data.filter(product => product && typeof product === "object" && product.name);
      buildCategories();
      renderProducts();
    })
    .catch(error => {
      console.error("Sarvyanta Market catalogue error:", error);
      grid.hidden = false;
      grid.replaceChildren();
      const message = document.createElement("div");
      message.className = "loading-card";
      message.textContent = "We’re updating the market. Please check back soon.";
      grid.appendChild(message);
      resultCount.textContent = "Products temporarily unavailable";
    });
})();
