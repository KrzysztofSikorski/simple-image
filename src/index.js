/**
 * Build styles
 */
require("./index.css").toString();

/**
 * SimpleImage Tool for the Editor.js
 * Works only with pasted image URLs and requires no server-side uploader.
 *
 * @typedef {object} SimpleImageData
 * @description Tool's input and output data format
 * @property {string} url — image URL
 * @property {string} caption — image caption
 */
class SimpleImage {
  /**
   * Render plugin`s main Element and fill it with saved data
   *
   * @param {{data: SimpleImageData, config: object, api: object}}
   *   data — previously saved data
   *   config - user config for Tool
   *   api - Editor.js API
   *   readOnly - read-only mode flag
   */
  constructor({ data, config, api, readOnly }) {
    /**
     * Editor.js API
     */
    this.api = api;
    this.readOnly = readOnly;

    /**
     * When block is only constructing,
     * current block points to previous block.
     * So real block index will be +1 after rendering
     *
     * @todo place it at the `rendered` event hook to get real block index without +1;
     * @type {number}
     */
    this.blockIndex = this.api.blocks.getCurrentBlockIndex() + 1;

    /**
     * Styles
     */
    this.CSS = {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,
      settingsButton: this.api.styles.settingsButton,
      settingsButtonActive: this.api.styles.settingsButtonActive,

      /**
       * Tool's classes
       */
      wrapper: "cdx-simple-image",
      imageHolder: "cdx-simple-image__picture",
      caption: "cdx-simple-image__caption",
    };

    /**
     * Nodes cache
     */
    this.nodes = {
      wrapper: null,
      imageHolder: null,
      image: null,
      caption: null,
      width: null,
      alt: null,
      license: null,
    };

    /**
     * Tool's initial data
     */
    this.data = {
      url: data.url || "",
      caption: data.caption || "",
      width: data.width || "600",
      alt: data.alt || "",
      license: data.license || "",
      link: data.link || "",
    };

    /**
     * Available Image settings
     */
    this.settings = [];
  }

  /**
   * Creates a Block:
   *  1) Show preloader
   *  2) Start to load an image
   *  3) After loading, append image and caption input
   *
   * @public
   */
  render() {
    const wrapper = this._make("div", [this.CSS.baseClass, this.CSS.wrapper]),
      loader = this._make("div", this.CSS.loading),
      imageHolder = this._make("div", this.CSS.imageHolder),
      image = this._make("img"),
      caption = this._make("div", [this.CSS.input, this.CSS.caption], {
        contentEditable: !this.readOnly,
        innerHTML: this.data.caption || "",
        id: "caption",
      }),
      width = this._make("div", [this.CSS.input, this.CSS.caption], {
        contentEditable: !this.readOnly,
        innerHTML: this.data.width || "",
        id: "width",
      }),
      alt = this._make("div", [this.CSS.input, this.CSS.caption], {
        contentEditable: !this.readOnly,
        innerHTML: this.data.alt || "",
        id: "alt",
      }),
      license = document.createElement("select"),
      (link = this._make("div", [this.CSS.input, this.CSS.caption], {
        contentEditable: !this.readOnly,
        innerHTML: this.data.link || "",
        id: "link",
      }));

    ['none', "publiczna", "cc2", "cc3", "cc4", "ccs2", "ccs3", "ccs4"].map((lic) => {
      const option = document.createElement("option");
      option.value = lic;
      option.innerHTML = lic;
      license.appendChild(option);
    });

    license.id = 'license'
    license.value = this.data.license || "none"

    caption.dataset.placeholder = "Enter a caption";
    width.dataset.placeholder = "Enter a width";
    alt.dataset.placeholder = "Enter a alt";
    link.dataset.placeholder = "Enter a link";

    wrapper.appendChild(loader);

    if (this.data.url) {
      image.src = this.data.url;
    }

    image.onload = () => {
      wrapper.classList.remove(this.CSS.loading);
      imageHolder.appendChild(image);
      wrapper.appendChild(imageHolder);
      wrapper.appendChild(caption);
      wrapper.appendChild(width);
      wrapper.appendChild(alt);
      wrapper.appendChild(license);
      wrapper.appendChild(link);
      loader.remove();
      this._acceptTuneView();
    };

    image.onerror = (e) => {
      // @todo use api.Notifies.show() to show error notification
      console.log("Failed to load an image", e);
    };

    this.nodes.imageHolder = imageHolder;
    this.nodes.wrapper = wrapper;
    this.nodes.image = image;
    this.nodes.caption = caption;
    this.nodes.width = width;
    this.nodes.alt = alt;
    this.nodes.license = license;
    this.nodes.link = link;

    return wrapper;
  }

  /**
   * @public
   * @param {Element} blockContent - Tool's wrapper
   * @returns {SimpleImageData}
   */
  save(blockContent) {
    const image = blockContent.querySelector("img"),
      caption = blockContent.querySelector("#caption"),
      alt = blockContent.querySelector("#alt"),
      width = blockContent.querySelector("#width"),
      license = blockContent.querySelector("#license");
    link = blockContent.querySelector("#link");

    if (!image) {
      return this.data;
    }

    return Object.assign(this.data, {
      url: image.src,
      caption: caption.innerHTML,
      width: width.innerHTML,
      alt: alt.innerHTML,
      license: license.value,
      link: link.innerHTML,
    });
  }

  /**
   * Sanitizer rules
   */
  static get sanitize() {
    return {
      url: {},
      caption: {
        br: true,
      },
      width: {
        br: true,
      },
      alt: {
        br: true,
      },
      license: {
        br: true,
      },
      link: {
        br: true,
      },
    };
  }

  /**
   * Notify core that read-only mode is suppoorted
   *
   * @returns {boolean}
   */
  static get isReadOnlySupported() {
    return true;
  }

  /**
   * Read pasted image and convert it to base64
   *
   * @static
   * @param {File} file
   * @returns {Promise<SimpleImageData>}
   */
  onDropHandler(file) {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    return new Promise((resolve) => {
      reader.onload = (event) => {
        resolve({
          url: event.target.result,
          caption: file.name,
        });
      };
    });
  }

  /**
   * On paste callback that is fired from Editor.
   *
   * @param {PasteEvent} event - event with pasted config
   */
  onPaste(event) {
    switch (event.type) {
      case "tag": {
        const img = event.detail.data;

        this.data = {
          url: img.src,
        };
        break;
      }

      case "pattern": {
        const { data: text } = event.detail;

        this.data = {
          url: text.replace(
            "https://fs.new.histmag.org/view",
            "https://histmag.org"
          ),
        };
        break;
      }

      case "file": {
        const { file } = event.detail;

        this.onDropHandler(file).then((data) => {
          this.data = data;
        });

        break;
      }
    }
  }

  /**
   * Returns image data
   *
   * @returns {SimpleImageData}
   */
  get data() {
    return this._data;
  }

  /**
   * Set image data and update the view
   *
   * @param {SimpleImageData} data
   */
  set data(data) {
    this._data = Object.assign({}, this.data, data);

    if (this.nodes.image) {
      this.nodes.image.src = this.data.url;
    }

    if (this.nodes.caption) {
      this.nodes.caption.innerHTML = this.data.caption;
    }
  }

  /**
   * Specify paste substitutes
   *
   * @see {@link ../../../docs/tools.md#paste-handling}
   * @public
   */
  static get pasteConfig() {
    return {
      patterns: {
        image: /https?:\/\/\S+\.(gif|jpe?g|tiff|png|webp)$/i,
      },
      tags: ["img"],
      files: {
        mimeTypes: ["image/*"],
      },
    };
  }

  /**
   * Makes buttons with tunes: add background, add border, stretch image
   *
   * @returns {HTMLDivElement}
   */
  renderSettings() {
    const wrapper = document.createElement("div");
    console.log(wrapper);

    // this.settings.forEach((tune) => {
    //   const el = document.createElement("div");

    //   el.classList.add(this.CSS.settingsButton);
    //   el.innerHTML = tune.icon;

    //   el.addEventListener("click", () => {
    //     this._toggleTune(tune.name);
    //     el.classList.toggle(this.CSS.settingsButtonActive);
    //   });

    //   el.classList.toggle(this.CSS.settingsButtonActive, this.data[tune.name]);

    //   wrapper.appendChild(el);
    // });

    return wrapper;
  }

  /**
   * Helper for making Elements with attributes
   *
   * @param  {string} tagName           - new Element tag name
   * @param  {Array|string} classNames  - list or name of CSS classname(s)
   * @param  {object} attributes        - any attributes
   * @returns {Element}
   */
  _make(tagName, classNames = null, attributes = {}) {
    const el = document.createElement(tagName);

    if (Array.isArray(classNames)) {
      el.classList.add(...classNames);
    } else if (classNames) {
      el.classList.add(classNames);
    }

    for (const attrName in attributes) {
      el[attrName] = attributes[attrName];
    }

    return el;
  }

  /**
   * Click on the Settings Button
   *
   * @private
   * @param tune
   */
  _toggleTune(tune) {
    this.data[tune] = !this.data[tune];
    this._acceptTuneView();
  }

  /**
   * Add specified class corresponds with activated tunes
   *
   * @private
   */
  _acceptTuneView() {
    this.settings.forEach((tune) => {
      this.nodes.imageHolder.classList.toggle(
        this.CSS.imageHolder +
          "--" +
          tune.name.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`),
        !!this.data[tune.name]
      );

      if (tune.name === "stretched") {
        this.api.blocks.stretchBlock(this.blockIndex, !!this.data.stretched);
      }
    });
  }
}

module.exports = SimpleImage;
