const {
  Plugin,
  PluginSettingTab,
  Setting,
  Modal,
  SuggestModal,
  FuzzySuggestModal,
  Notice,
} = require("obsidian");

const DEFAULT_SETTINGS = {
  scripts: [],
  alwaysShowSettingsButton: true,
  menuPosition: "bottom",
  menuStyle: "default",
};

const COLOR_PALETTE = [
  "#e3f2fd",
  "#e8f5e9",
  "#fff8e1",
  "#ffebee",
  "#f3e5f5",
  "#e1f5fe",
  "#f1f8e9",
  "#fff3e0",
  "#fbe9e7",
  "#e0f7fa",
  "#bbdefb",
  "#c8e6c9",
  "#ffecb3",
  "#ffcdd2",
  "#e1bee7",
  "#81d4fa",
  "#a5d6a7",
  "#ffe082",
  "#ef9a9a",
  "#ce93d8",
  "#4fc3f7",
  "#66bb6a",
  "#ffd54f",
  "#ef5350",
  "#ab47bc",
];

const UIUtils = {
  createButton(text, onClick, options = {}) {
    const button = document.createElement("button");
    button.classList.add("SnapScript-button");
    button.innerHTML = text;
    button.style.margin = "2px";
    button.style.padding = "4px 8px";
    button.style.background = options.color || "transparent";
    button.style.border = "none";
    button.style.borderRadius = "3px";
    button.style.cursor = "pointer";
    button.style.color = options.textColor || "var(--text-normal)";

    if (options.tooltip) {
      button.setAttribute("title", options.tooltip);
    }

    button.addEventListener("mouseenter", () => {
      button.style.background =
        options.hoverColor || "var(--background-modifier-hover)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.background = options.color || "transparent";
    });

    button.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    });

    return button;
  },
};

class SnapScriptSuggestModal extends SuggestModal {
  constructor(app, title, options, onSelect) {
    super(app);
    this.title = title;
    this.options = options;
    this.onSelect = onSelect;
    this.setPlaceholder(`검색: ${title}`);
  }

  getSuggestions(query) {
    if (!query) return this.options;

    return this.options.filter(
      (option) =>
        option.label.toLowerCase().includes(query.toLowerCase()) ||
        (option.description &&
          option.description.toLowerCase().includes(query.toLowerCase())),
    );
  }

  renderSuggestion(option, el) {
    el.createEl("div", { text: option.label });
    if (option.description) {
      el.createEl("small", { text: option.description });
    }
  }

  onChooseSuggestion(option, evt) {
    this.onSelect(option.value);
  }
}

class SnapScriptFuzzySuggestModal extends FuzzySuggestModal {
  constructor(app, title, options, onSelect) {
    super(app);
    this.title = title;
    this.options = options;
    this.onSelect = onSelect;
    this.setPlaceholder(`퍼지 검색: ${title}`);
  }

  getItems() {
    return this.options;
  }

  getItemText(option) {
    return option.label + (option.description ? " " + option.description : "");
  }

  onChooseItem(option) {
    this.onSelect(option.value);
  }
}

class SnapScriptPlugin extends Plugin {
  settings = DEFAULT_SETTINGS;
  scriptCache = {};

  async onload() {
    await this.loadSettings();
    this.settingTab = new SnapScriptSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);

    this.registerEvent(
      this.app.workspace.on(
        "editor-selection-change",
        this.onTextSelected.bind(this),
      ),
    );
    document.addEventListener("mousedown", this.onMouseDown.bind(this));

    this.escKeyHandler = this.handleEscKey.bind(this);
    document.addEventListener("keydown", this.escKeyHandler);

    this.addCommand({
      id: "show-SnapScript-menu",
      name: "스냅스크립트 메뉴 표시",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "p" }],
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (selection && selection.trim() !== "") {
          this.showMenu(editor, selection);
        } else {
          this.showMenuAtCursor(editor);
        }
      },
    });
  }
  handleEscKey(event) {
    if (event.key === "Escape") {
      this.closeMenu();
    }
  }

  onMouseDown(e) {
    const menu = document.querySelector(".SnapScript-menu");
    if (menu && !menu.contains(e.target)) {
      this.closeMenu();
    }
  }

  onTextSelected(editor) {
    if (!editor || !editor.getSelection) return;

    const selection = editor.getSelection();
    if (!selection || selection.trim() === "") {
      this.closeMenu();
      return;
    }

    this.showMenu(editor, selection);
  }

  closeMenu() {
    document.querySelector(".SnapScript-menu")?.remove();
    document.querySelector(".SnapScript-submenu")?.remove();
  }

  showMenu(editor, text) {
    try {
      this.closeMenu();

      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const menu = this.createMenuElement(rect, editor);

      document.body.appendChild(menu);
    } catch (error) {
      console.error("메뉴 표시 중 오류:", error);
    }
  }

  showMenuAtCursor(editor) {
    try {
      this.closeMenu();

      const cursor = editor.getCursor();

      const cursorCoords = editor.coordsAtPos
        ? editor.coordsAtPos(cursor)
        : { left: 0, top: 0, bottom: 0 };

      const rect = {
        left: cursorCoords.left,
        right: cursorCoords.left + 5,
        top: cursorCoords.top,
        bottom: cursorCoords.bottom,
        width: 5,
        height: cursorCoords.bottom - cursorCoords.top,
      };

      const menu = this.createMenuElement(rect, editor);
      document.body.appendChild(menu);
    } catch (error) {
      console.error("커서 위치에 메뉴 표시 중 오류:", error);

      try {
        const centerRect = {
          left: window.innerWidth / 2 - 50,
          right: window.innerWidth / 2 + 50,
          top: window.innerHeight / 2 - 10,
          bottom: window.innerHeight / 2 + 10,
          width: 100,
          height: 20,
        };

        const menu = this.createMenuElement(centerRect, editor);
        document.body.appendChild(menu);
      } catch (e) {
        console.error("대체 메뉴 표시 중 오류:", e);
      }
    }
  }

  createMenuElement(rect, editor) {
    const menu = document.createElement("div");
    menu.classList.add("SnapScript-menu");
    menu.style.position = "fixed";

    this.positionMenu(menu, rect);

    menu.style.background = "var(--background-primary)";
    menu.style.border = "1px solid var(--background-modifier-border)";
    menu.style.borderRadius = "4px";
    menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    menu.style.padding = "4px";
    menu.style.display = "flex";
    menu.style.flexWrap = "wrap";
    menu.style.maxWidth = "90vw";
    menu.style.zIndex = "1000";

    if (this.settings.alwaysShowSettingsButton) {
      const settingsButton = UIUtils.createButton(
        "⚙️",
        () => {
          this.app.setting.open();
          this.app.setting.openTabById(this.manifest.id);
          this.closeMenu();
        },
        { tooltip: "설정" },
      );

      menu.appendChild(settingsButton);
    }

    if (!this.settings.scripts || this.settings.scripts.length === 0) {
      const addButton = UIUtils.createButton(
        "➕ 스크립트 추가",
        () => {
          this.closeMenu();
          this.createNewScript();
        },
        { tooltip: "새 스크립트 추가" },
      );

      menu.appendChild(addButton);
      return menu;
    }

    this.addScripts(menu, editor);

    return menu;
  }

  positionMenu(menu, rect) {
    switch (this.settings.menuPosition || "bottom") {
      case "top":
        menu.style.left = `${rect.left + rect.width / 2 - 50}px`;
        menu.style.bottom = `${window.innerHeight - rect.top + 5}px`;
        break;
      case "left":
        menu.style.right = `${window.innerWidth - rect.left + 5}px`;
        menu.style.top = `${rect.top + rect.height / 2 - 20}px`;
        break;
      case "right":
        menu.style.left = `${rect.right + 5}px`;
        menu.style.top = `${rect.top + rect.height / 2 - 20}px`;
        break;
      case "bottom":
      default:
        menu.style.left = `${rect.left + rect.width / 2 - 50}px`;
        menu.style.top = `${rect.bottom + 5}px`;
        break;
    }
  }

  addScripts(menu, editor) {
    const hasSelection = editor.getSelection()?.trim() !== "";

    const filteredScripts = this.settings.scripts.filter(
      (script) =>
        (script.requiresSelection === true && hasSelection) ||
        script.requiresSelection === false,
    );

    if (filteredScripts.length === 0) {
      const message = document.createElement("div");
      message.style.padding = "4px 8px";
      message.style.color = "var(--text-muted)";

      if (hasSelection) {
        message.textContent = "사용 가능한 스크립트가 없습니다.";
      } else {
        message.textContent =
          "텍스트를 선택하여 더 많은 스크립트를 확인하세요.";
      }

      menu.appendChild(message);
    }

    filteredScripts.forEach((script) => {
      const buttonText = script.displayName || script.name;
      const buttonColor = script.color || "transparent";

      const button = UIUtils.createButton(
        buttonText,
        () => {
          this.executeScript(script, editor);
          this.closeMenu();
        },
        {
          color: buttonColor,
          tooltip: script.name,
        },
      );

      menu.appendChild(button);
    });
  }

  createNewScript() {
    const newScript = {
      id: this.generateId(),
      name: "새 스크립트",
      code: "/* 예시 스크립트 선택 텍스트 볼드체로 변환 */\nreturn `**${text}**`",
      displayName: "",
      color: "",
      requiresSelection: true,
    };

    new ScriptEditorModal(this.app, this, newScript, async (updatedScript) => {
      this.settings.scripts.push(updatedScript);
      await this.saveSettings();
      this.settingTab?.display();
    }).open();
  }

  generateId() {
    return (
      Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9)
    );
  }

  async executeScript(script, editor) {
    try {
      const selections = editor.listSelections();

      if (selections.length > 1) {
        await this.applyScriptToMultiSelections(script, selections, editor);
      } else if (selections.length === 1) {
        const selection = editor.getRange(
          selections[0].anchor,
          selections[0].head,
        );
        await this.applyScriptToSingleSelection(script, selection, editor);
      } else {
        console.warn("선택 영역이 없거나 유효하지 않습니다.");
      }
    } catch (error) {
      console.error("스크립트 실행 중 오류:", error);
    }
  }

  async applyScriptToSingleSelection(script, text, editor) {
    try {
      const cacheKey = script.id + "_" + script.code;
      let func;

      const promptHelpers = {
        showPrompt: (title, placeholder = "", defaultValue = "") => {
          return new Promise((resolve) => {
            new TextInputModal(
              this.app,
              title,
              placeholder,
              defaultValue,
              (result) => {
                resolve(result);
              },
            ).open();
          });
        },

        showMultiInputPrompt: (title, fields) => {
          return new Promise((resolve) => {
            new MultiInputModal(this.app, title, fields, (results) => {
              resolve(results);
            }).open();
          });
        },

        showSuggestPrompt: (title, options) => {
          return new Promise((resolve) => {
            new SnapScriptSuggestModal(this.app, title, options, (result) => {
              resolve(result);
            }).open();
          });
        },

        showFuzzySuggestPrompt: (title, options) => {
          return new Promise((resolve) => {
            new SnapScriptFuzzySuggestModal(
              this.app,
              title,
              options,
              (result) => {
                resolve(result);
              },
            ).open();
          });
        },

        showNotice: (message, timeout = 5000) => {
          new Notice(message, timeout);
        },
      };

      const isAsync =
        script.code.includes("await ") ||
        script.code.includes("showPrompt") ||
        script.code.includes("showMultiInputPrompt") ||
        script.code.includes("showSuggestPrompt") ||
        script.code.includes("showFuzzySuggestPrompt") ||
        script.code.includes("showNotice");

      if (isAsync) {
        const asyncFunc = new Function(
          "text",
          "editor",
          "showPrompt",
          "showMultiInputPrompt",
          "showSuggestPrompt",
          "showFuzzySuggestPrompt",
          "showNotice",
          `return (async () => {      
            try {      
              ${script.code}      
            } catch(e) {  
              console.error("스크립트 실행 오류:", e);
              return text;      
            }      
          })();`,
        );

        const result = await asyncFunc(
          text,
          editor,
          promptHelpers.showPrompt,
          promptHelpers.showMultiInputPrompt,
          promptHelpers.showSuggestPrompt,
          promptHelpers.showFuzzySuggestPrompt,
          promptHelpers.showNotice,
        );
        this.applyResultToEditor(result, editor);
      } else {
        if (!this.scriptCache[cacheKey]) {
          let scriptCode = script.code;
          if (!scriptCode.includes("return")) {
            scriptCode = `${scriptCode}\nreturn text;`;
          }

          this.scriptCache[cacheKey] = new Function(
            "text",
            "editor",
            scriptCode,
          );
        }

        func = this.scriptCache[cacheKey];
        const result = func(text, editor);

        this.applyResultToEditor(result, editor);
      }
    } catch (error) {
      console.error("스크립트 실행 중 오류:", error);
    }
  }

  applyResultToEditor(result, editor) {
    if (result !== null && result !== undefined && typeof result === "string") {
      setTimeout(() => {
        editor.replaceSelection(result);
      }, 10);
    }
  }

  async applyScriptToMultiSelections(script, selections, editor) {
    try {
      const results = new Array(selections.length);
      const userInputs = {};

      const promptHelpers = {
        showPrompt: async (title, placeholder = "", defaultValue = "") => {
          const cacheKey = `prompt_${title}`;
          if (userInputs[cacheKey] !== undefined) return userInputs[cacheKey];

          return new Promise((resolve) => {
            new TextInputModal(
              this.app,
              title,
              placeholder,
              defaultValue,
              (result) => {
                userInputs[cacheKey] = result;
                resolve(result);
              },
            ).open();
          });
        },

        showMultiInputPrompt: async (title, fields) => {
          const cacheKey = `multiInput_${title}`;
          if (userInputs[cacheKey] !== undefined) return userInputs[cacheKey];

          return new Promise((resolve) => {
            new MultiInputModal(this.app, title, fields, (results) => {
              userInputs[cacheKey] = results;
              resolve(results);
            }).open();
          });
        },

        showSuggestPrompt: async (title, options) => {
          const cacheKey = `suggest_${title}`;
          if (userInputs[cacheKey] !== undefined) return userInputs[cacheKey];

          return new Promise((resolve) => {
            new SnapScriptSuggestModal(this.app, title, options, (result) => {
              userInputs[cacheKey] = result;
              resolve(result);
            }).open();
          });
        },

        showFuzzySuggestPrompt: async (title, options) => {
          const cacheKey = `fuzzySuggest_${title}`;
          if (userInputs[cacheKey] !== undefined) return userInputs[cacheKey];

          return new Promise((resolve) => {
            new SnapScriptFuzzySuggestModal(
              this.app,
              title,
              options,
              (result) => {
                userInputs[cacheKey] = result;
                resolve(result);
              },
            ).open();
          });
        },

        showNotice: (message, timeout = 5000) => {
          new Notice(message, timeout);
        },
      };

      const isAsync =
        script.code.includes("await ") ||
        script.code.includes("showPrompt") ||
        script.code.includes("showMultiInputPrompt") ||
        script.code.includes("showSuggestPrompt") ||
        script.code.includes("showFuzzySuggestPrompt") ||
        script.code.includes("showNotice");

      if (isAsync) {
        for (let i = 0; i < selections.length; i++) {
          const selection = editor.getRange(
            selections[i].anchor,
            selections[i].head,
          );

          const asyncFunc = new Function(
            "text",
            "editor",
            "showPrompt",
            "showMultiInputPrompt",
            "showSuggestPrompt",
            "showFuzzySuggestPrompt",
            "showNotice",
            `return (async () => {      
              try {      
                ${script.code}      
              } catch(e) {  
                console.error("스크립트 실행 오류:", e);    
                return text;      
              }      
            })();`,
          );

          const virtualEditor = {
            getSelection: () => selection,
            replaceSelection: (val) => {
              results[i] = val;
            },
          };

          results[i] =
            (await asyncFunc(
              selection,
              virtualEditor,
              promptHelpers.showPrompt,
              promptHelpers.showMultiInputPrompt,
              promptHelpers.showSuggestPrompt,
              promptHelpers.showFuzzySuggestPrompt,
              promptHelpers.showNotice,
            )) || selection;
        }
      } else {
        let scriptCode = script.code;
        if (!scriptCode.includes("return")) {
          scriptCode = `${scriptCode}\nreturn text;`;
        }

        const func = new Function("text", "editor", scriptCode);

        for (let i = 0; i < selections.length; i++) {
          const selection = editor.getRange(
            selections[i].anchor,
            selections[i].head,
          );

          const virtualEditor = {
            getSelection: () => selection,
            replaceSelection: (val) => {
              results[i] = val;
            },
          };

          const result = func(selection, virtualEditor);
          results[i] =
            result !== null &&
            result !== undefined &&
            typeof result === "string"
              ? result
              : selection;
        }
      }

      const changes = selections.map((selection, i) => ({
        from: selection.anchor,
        to: selection.head,
        text: results[i],
      }));

      editor.transaction({ changes });
    } catch (error) {
      console.error("다중 선택 스크립트 적용 중 오류:", error);
    }
  }

  async exportScripts() {
    const jsonData = JSON.stringify(this.settings.scripts, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "SnapScript-scripts.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  importScripts() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const contents = e.target.result;
          const scripts = JSON.parse(contents);

          if (!Array.isArray(scripts)) {
            throw new Error("유효하지 않은 스크립트 파일입니다.");
          }

          const updatedScripts = scripts.map((script) => ({
            ...script,
            id: this.generateId(),
            category: undefined,
          }));

          new ImportConfirmModal(
            this.app,
            updatedScripts,
            (selectedScripts) => {
              if (selectedScripts && selectedScripts.length > 0) {
                this.settings.scripts = [
                  ...this.settings.scripts,
                  ...selectedScripts,
                ];
                this.saveSettings();
                this.settingTab?.display();
              }
            },
          ).open();
        } catch (error) {
          console.error("스크립트 가져오기 오류:", error);
        }
      };
      reader.readAsText(file);
    };

    fileInput.click();
  }

  async loadSettings() {
    try {
      const savedData = await this.loadData();
      this.settings = Object.assign({}, DEFAULT_SETTINGS);

      if (savedData && typeof savedData === "object") {
        if (Array.isArray(savedData.scripts)) {
          this.settings.scripts = savedData.scripts.map((script) => ({
            id: script.id || this.generateId(),
            name: script.name || "스크립트",
            code: script.code || "",
            displayName: script.displayName || "",
            color: script.color || "",
            requiresSelection:
              script.requiresSelection !== undefined
                ? script.requiresSelection
                : true,
          }));
        }

        Object.keys(DEFAULT_SETTINGS).forEach((key) => {
          if (key !== "scripts" && savedData[key] !== undefined) {
            this.settings[key] = savedData[key];
          }
        });
      }
    } catch (error) {
      console.error("설정 로드 오류:", error);
      this.settings = Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("keydown", this.escKeyHandler);

    this.closeMenu();
  }
}

class BaseModal extends Modal {
  constructor(app, title) {
    super(app);
    this.title = title;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: this.title });

    this.renderContent(contentEl);
    this.renderButtons(contentEl);
  }

  renderContent(contentEl) {}

  renderButtons(contentEl) {
    const buttonDiv = contentEl.createDiv();
    buttonDiv.style.display = "flex";
    buttonDiv.style.justifyContent = "flex-end";
    buttonDiv.style.gap = "10px";
    buttonDiv.style.marginTop = "20px";

    this.createButtons(buttonDiv);
  }

  createButtons(buttonDiv) {
    const cancelButton = buttonDiv.createEl("button", { text: "취소" });
    cancelButton.addEventListener("click", () => this.close());

    const submitButton = buttonDiv.createEl("button", { text: "확인" });
    submitButton.classList.add("mod-cta");
    submitButton.addEventListener("click", () => {
      this.handleSubmit();
      this.close();
    });
  }

  handleSubmit() {}

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class TextInputModal extends BaseModal {
  constructor(app, title, placeholder, initialValue, onSubmit) {
    super(app, title);
    this.placeholder = placeholder;
    this.initialValue = initialValue || "";
    this.onSubmit = onSubmit;
    this.value = this.initialValue;
  }

  renderContent(contentEl) {
    new Setting(contentEl).addText((text) =>
      text
        .setValue(this.initialValue)
        .setPlaceholder(this.placeholder)
        .onChange((value) => {
          this.value = value;
        }),
    );
  }

  handleSubmit() {
    this.onSubmit(this.value);
  }
}

class MultiInputModal extends BaseModal {
  constructor(app, title, fields, onSubmit) {
    super(app, title);
    this.fields = fields;
    this.onSubmit = onSubmit;
    this.values = {};

    this.fields.forEach((field) => {
      this.values[field.id] = field.initialValue || "";
    });
  }

  renderContent(contentEl) {
    this.fields.forEach((field) => {
      new Setting(contentEl).setName(field.label).addText((text) =>
        text
          .setValue(field.initialValue || "")
          .setPlaceholder(field.placeholder || "")
          .onChange((value) => {
            this.values[field.id] = value;
          }),
      );
    });
  }

  handleSubmit() {
    this.onSubmit(this.values);
  }
}

class ScriptEditorModal extends BaseModal {
  constructor(app, plugin, script, onSave) {
    super(app, "스크립트 편집");
    this.plugin = plugin;
    this.script = script;
    this.onSave = onSave;

    this.editingScript = {
      id: script.id,
      name: script.name,
      code: script.code,
      displayName: script.displayName || "",
      color: script.color || "",
    };
  }

  renderContent(contentEl) {
    contentEl.setAttribute("style", "max-width: 800px; width: 80%;");

    const infoSection = contentEl.createDiv();
    infoSection.createEl("h3", { text: "기본 정보" });

    new Setting(infoSection)
      .setName("스크립트 이름")
      .setDesc("설정에 표시될 이름입니다")
      .addText((text) =>
        text.setValue(this.editingScript.name).onChange((value) => {
          this.editingScript.name = value;
        }),
      );

    new Setting(infoSection)
      .setName("표시 이름 (선택사항)")
      .setDesc("메뉴에 표시될 이름입니다. 비워두면 스크립트 이름이 사용됩니다")
      .addText((text) =>
        text.setValue(this.editingScript.displayName).onChange((value) => {
          this.editingScript.displayName = value;
        }),
      );

    new Setting(infoSection)
      .setName("선택 영역 필요")
      .setDesc("이 스크립트가 선택된 텍스트를 필요로 하는지 여부")
      .addToggle((toggle) =>
        toggle
          .setValue(this.editingScript.requiresSelection !== false)
          .onChange((value) => {
            this.editingScript.requiresSelection = value;
          }),
      );

    this.renderColorSetting(infoSection);
    this.renderCodeEditor(contentEl);
  }

  renderColorSetting(container) {
    const colorSetting = new Setting(container)
      .setName("버튼 색상")
      .setDesc("메뉴에 표시될 버튼의 배경색입니다");

    colorSetting.addText((text) => {
      const colorInput = text
        .setValue(this.editingScript.color)
        .setPlaceholder("#rrggbb 또는 rgba(r,g,b,a)")
        .onChange((value) => {
          this.editingScript.color = value;
          this.updateColorPreview();
        });

      this.colorInputField = colorInput.inputEl;

      const colorPicker = document.createElement("input");
      colorPicker.type = "color";
      colorPicker.value = this.editingScript.color || "#ffffff";
      colorPicker.style.marginLeft = "8px";
      colorPicker.style.cursor = "pointer";
      colorPicker.style.width = "28px";
      colorPicker.style.height = "28px";
      colorPicker.style.padding = "0";
      colorPicker.style.border = "1px solid var(--background-modifier-border)";
      colorPicker.style.borderRadius = "4px";

      colorPicker.addEventListener("input", (e) => {
        const color = e.target.value;
        this.colorInputField.value = color;
        this.editingScript.color = color;
        this.updateColorPreview();
      });

      text.inputEl.parentElement.appendChild(colorPicker);
      this.colorPicker = colorPicker;

      return colorInput;
    });

    this.renderColorPalette(container);

    const previewContainer = container.createDiv("color-preview-container");
    previewContainer.style.display = "flex";
    previewContainer.style.alignItems = "center";
    previewContainer.style.marginBottom = "15px";

    const previewLabel = previewContainer.createEl("span");
    previewLabel.textContent = "미리보기: ";
    previewLabel.style.marginRight = "10px";

    const colorPreview = previewContainer.createDiv("color-preview");
    colorPreview.style.display = "flex";
    colorPreview.style.alignItems = "center";
    colorPreview.style.justifyContent = "center";
    colorPreview.style.width = "100px";
    colorPreview.style.height = "30px";
    colorPreview.style.backgroundColor =
      this.editingScript.color || "transparent";
    colorPreview.style.border = "1px solid var(--background-modifier-border)";
    colorPreview.style.borderRadius = "4px";
    colorPreview.style.color = "var(--text-normal)";
    colorPreview.textContent = "버튼";

    this.colorPreview = colorPreview;
  }

  renderColorPalette(container) {
    const paletteDiv = container.createDiv("color-palette");
    paletteDiv.style.display = "flex";
    paletteDiv.style.flexWrap = "wrap";
    paletteDiv.style.gap = "5px";
    paletteDiv.style.marginTop = "10px";
    paletteDiv.style.marginBottom = "15px";

    COLOR_PALETTE.forEach((color) => {
      const colorSwatch = paletteDiv.createDiv("color-swatch");
      colorSwatch.style.width = "20px";
      colorSwatch.style.height = "20px";
      colorSwatch.style.backgroundColor = color;
      colorSwatch.style.border = "1px solid var(--background-modifier-border)";
      colorSwatch.style.borderRadius = "4px";
      colorSwatch.style.cursor = "pointer";

      if (color === this.editingScript.color) {
        colorSwatch.style.boxShadow = "0 0 0 2px var(--interactive-accent)";
      }

      colorSwatch.addEventListener("click", () => {
        this.editingScript.color = color;
        this.colorInputField.value = color;
        if (this.colorPicker) {
          this.colorPicker.value = color;
        }
        this.updateColorPreview();

        document.querySelectorAll(".color-swatch").forEach((swatch) => {
          swatch.style.boxShadow = "";
        });

        colorSwatch.style.boxShadow = "0 0 0 2px var(--interactive-accent)";
      });
    });
  }

  renderCodeEditor(contentEl) {
    const codeSection = contentEl.createDiv();
    codeSection.style.marginTop = "20px";
    codeSection.createEl("h3", { text: "스크립트 코드" });

    const codeDiv = codeSection.createDiv();
    const codeTextArea = codeDiv.createEl("textarea", {
      text: this.editingScript.code,
    });
    codeTextArea.style.width = "100%";
    codeTextArea.style.height = "300px";
    codeTextArea.style.fontFamily = "monospace";
    codeTextArea.style.fontSize = "14px";
    codeTextArea.style.lineHeight = "1.4";
    codeTextArea.style.padding = "8px";
    codeTextArea.style.border = "1px solid var(--background-modifier-border)";
    codeTextArea.style.borderRadius = "4px";
    codeTextArea.style.marginBottom = "10px";

    codeTextArea.addEventListener("input", () => {
      this.editingScript.code = codeTextArea.value;
    });
  }

  createButtons(buttonDiv) {
    const cancelButton = buttonDiv.createEl("button", { text: "취소" });
    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const testButton = buttonDiv.createEl("button", { text: "테스트" });
    testButton.addEventListener("click", () => {
      new ScriptTestingModal(this.app, this.plugin, this.editingScript).open();
    });

    const saveButton = buttonDiv.createEl("button", { text: "저장" });
    saveButton.classList.add("mod-cta");
    saveButton.addEventListener("click", () => {
      this.close();
      this.onSave(this.editingScript);
    });
  }

  updateColorPreview() {
    if (this.colorPreview) {
      this.colorPreview.style.backgroundColor =
        this.editingScript.color || "transparent";
    }
  }

  handleSubmit() {
    this.onSave(this.editingScript);
  }
}

class ScriptTestingModal extends BaseModal {
  constructor(app, plugin, script) {
    super(app, "스크립트 테스트");
    this.plugin = plugin;
    this.script = script;
  }

  renderContent(contentEl) {
    const inputSection = contentEl.createDiv();
    inputSection.createEl("label", { text: "입력 텍스트" });
    const inputArea = inputSection.createEl("textarea");
    inputArea.style.width = "100%";
    inputArea.style.height = "100px";
    inputArea.style.fontFamily = "monospace";
    inputArea.style.padding = "8px";
    inputArea.value = "테스트 텍스트를 여기에 입력하세요.";

    const runButton = contentEl.createEl("button", { text: "실행" });
    runButton.classList.add("mod-cta");
    runButton.style.marginTop = "10px";
    runButton.addEventListener("click", () => {
      this.runTest(inputArea.value);
    });

    const resultSection = contentEl.createDiv();
    resultSection.style.marginTop = "20px";
    resultSection.createEl("label", { text: "실행 결과" });
    const resultArea = resultSection.createEl("div");
    resultArea.style.padding = "10px";
    resultArea.style.border = "1px solid var(--background-modifier-border)";
    resultArea.style.borderRadius = "4px";
    resultArea.style.background = "var(--background-secondary)";
    resultArea.style.minHeight = "100px";
    resultArea.style.whiteSpace = "pre-wrap";
    resultArea.style.fontFamily = "monospace";

    this.resultArea = resultArea;
  }

  async runTest(input) {
    try {
      this.resultArea.textContent = "실행 중...";

      const mockEditor = {
        getSelection: () => input,
        replaceSelection: (text) => {
          this.displayResult(text, input);
        },
        getSelections: () => [input],
        replaceSelections: (texts) => {
          if (Array.isArray(texts) && texts.length > 0) {
            this.displayResult(texts[0], input);
          }
        },
      };

      await this.plugin.executeScript(this.script, mockEditor);
    } catch (error) {
      this.resultArea.textContent = `오류 발생: ${error.message}`;
    }
  }

  displayResult(text, input) {
    this.resultArea.innerHTML = "";
    this.resultArea.createEl("div", { text: "결과:" });

    const formattedResult = this.resultArea.createEl("div");
    formattedResult.style.marginTop = "5px";
    formattedResult.style.padding = "5px";
    formattedResult.style.background = "var(--background-primary)";
    formattedResult.style.borderRadius = "3px";
    formattedResult.textContent = text;

    if (text !== input) {
      const diffSection = this.resultArea.createEl("div");
      diffSection.style.marginTop = "10px";
      diffSection.innerHTML = `<div>입력에서 변경된 내용:</div>`;

      const diffEl = diffSection.createEl("pre");
      diffEl.style.padding = "5px";
      diffEl.style.background = "var(--background-primary)";
      diffEl.style.borderRadius = "3px";
      diffEl.style.whiteSpace = "pre-wrap";
      diffEl.textContent = text;
    }
  }
}

class ImportConfirmModal extends BaseModal {
  constructor(app, scripts, onConfirm) {
    super(app, "스크립트 가져오기");
    this.scripts = scripts;
    this.onConfirm = onConfirm;
    this.selectedScripts = [...scripts];
  }

  renderContent(contentEl) {
    contentEl.createEl("p", {
      text: `${this.scripts.length}개의 스크립트를 가져옵니다. 가져올 스크립트를 선택하세요:`,
    });

    const selectAllDiv = contentEl.createDiv();
    const selectAllCheckbox = selectAllDiv.createEl("input", {
      type: "checkbox",
    });
    selectAllCheckbox.checked = true;
    selectAllDiv.appendChild(document.createTextNode(" 전체 선택/해제"));

    selectAllCheckbox.addEventListener("change", () => {
      const checkboxes = document.querySelectorAll(".script-import-checkbox");
      checkboxes.forEach((cb) => {
        cb.checked = selectAllCheckbox.checked;
      });

      this.selectedScripts = selectAllCheckbox.checked ? [...this.scripts] : [];
    });

    const listDiv = contentEl.createDiv("import-list");
    listDiv.style.maxHeight = "300px";
    listDiv.style.overflowY = "auto";
    listDiv.style.margin = "10px 0";
    listDiv.style.border = "1px solid var(--background-modifier-border)";
    listDiv.style.borderRadius = "4px";
    listDiv.style.padding = "5px";

    this.scripts.forEach((script, index) => {
      const scriptDiv = listDiv.createDiv("script-import-item");
      scriptDiv.style.padding = "8px";
      scriptDiv.style.borderBottom =
        index < this.scripts.length - 1
          ? "1px solid var(--background-modifier-border)"
          : "none";

      const checkbox = scriptDiv.createEl("input", { type: "checkbox" });
      checkbox.classList.add("script-import-checkbox");
      checkbox.checked = true;
      checkbox.dataset.index = index;

      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          this.selectedScripts.push(script);
        } else {
          this.selectedScripts = this.selectedScripts.filter(
            (s) => s !== script,
          );
        }

        const allChecked =
          document.querySelectorAll(".script-import-checkbox:checked")
            .length === this.scripts.length;
        selectAllCheckbox.checked = allChecked;
      });

      const infoDiv = scriptDiv.createDiv();
      infoDiv.createEl("strong", { text: script.name });

      this.renderScriptMeta(infoDiv, script);
    });
  }

  renderScriptMeta(container, script) {
    if (!script.color) return;

    const metaDiv = container.createDiv();
    metaDiv.style.fontSize = "0.85em";
    metaDiv.style.color = "var(--text-muted)";

    const colorSpan = metaDiv.createSpan();
    colorSpan.textContent = "색상: ";

    const colorBox = metaDiv.createSpan();
    colorBox.style.display = "inline-block";
    colorBox.style.width = "12px";
    colorBox.style.height = "12px";
    colorBox.style.backgroundColor = script.color;
    colorBox.style.border = "1px solid var(--background-modifier-border)";
    colorBox.style.borderRadius = "2px";
    colorBox.style.marginLeft = "3px";
  }

  createButtons(buttonDiv) {
    const cancelButton = buttonDiv.createEl("button", { text: "취소" });
    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const importButton = buttonDiv.createEl("button", { text: "가져오기" });
    importButton.classList.add("mod-cta");
    importButton.addEventListener("click", () => {
      this.close();
      this.onConfirm(this.selectedScripts);
    });
  }

  handleSubmit() {
    this.onConfirm(this.selectedScripts);
  }
}

class SnapScriptSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.style.display = "flex";
    containerEl.style.flexDirection = "column";
    containerEl.style.height = "100%";

    this.renderSettingsSection(containerEl);

    const contentContainer = containerEl.createDiv("content-container");
    contentContainer.style.display = "flex";
    contentContainer.style.flexDirection = "row";
    contentContainer.style.flexGrow = "1";
    contentContainer.style.minHeight = "400px";
    contentContainer.style.height = "0";

    const scriptsPanel = contentContainer.createDiv("scripts-panel");
    scriptsPanel.style.flexBasis = "100%";
    scriptsPanel.style.marginRight = "10px";
    scriptsPanel.style.overflow = "auto";
    scriptsPanel.style.border = "1px solid var(--background-modifier-border)";
    scriptsPanel.style.borderRadius = "4px";
    scriptsPanel.style.padding = "10px";

    this.renderScriptsPanel(scriptsPanel);
  }

  renderSettingsSection(containerEl) {
    const settingsSection = containerEl.createDiv("settings-section");
    settingsSection.style.marginBottom = "20px";

    settingsSection.createEl("h2", { text: "SnapScript 설정" });

    new Setting(settingsSection)
      .setName("메뉴 위치")
      .setDesc("선택한 텍스트 주변에 메뉴가 나타나는 위치")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("bottom", "아래")
          .addOption("top", "위")
          .addOption("left", "왼쪽")
          .addOption("right", "오른쪽")
          .setValue(this.plugin.settings.menuPosition || "bottom")
          .onChange(async (value) => {
            this.plugin.settings.menuPosition = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(settingsSection)
      .setName("설정 버튼 표시")
      .setDesc("메뉴에 항상 설정 버튼을 표시합니다")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.alwaysShowSettingsButton)
          .onChange(async (value) => {
            this.plugin.settings.alwaysShowSettingsButton = value;
            await this.plugin.saveSettings();
          }),
      );

    this.renderButtonContainer(settingsSection);
  }

  renderButtonContainer(container) {
    const buttonContainer = container.createDiv("button-container");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-between";
    buttonContainer.style.marginTop = "15px";

    const leftButtons = buttonContainer.createDiv();
    leftButtons.style.display = "flex";
    leftButtons.style.gap = "10px";

    const addButton = leftButtons.createEl("button", { text: "스크립트 추가" });
    addButton.classList.add("mod-cta");
    addButton.addEventListener("click", () => {
      this.plugin.createNewScript();
    });

    const rightButtons = buttonContainer.createDiv();
    rightButtons.style.display = "flex";
    rightButtons.style.gap = "10px";

    const importButton = rightButtons.createEl("button", { text: "가져오기" });
    importButton.addEventListener("click", () => {
      this.plugin.importScripts();
    });

    const exportButton = rightButtons.createEl("button", { text: "내보내기" });
    exportButton.addEventListener("click", () => {
      this.plugin.exportScripts();
    });
  }

  renderScriptsPanel(containerEl) {
    containerEl.empty();
    containerEl.createEl("h3", { text: "등록된 스크립트" });

    if (
      !this.plugin.settings.scripts ||
      this.plugin.settings.scripts.length === 0
    ) {
      this.renderEmptyScriptsMessage(containerEl);
      return;
    }

    const sortInfo = containerEl.createDiv();
    sortInfo.style.margin = "10px 0";
    sortInfo.style.color = "var(--text-muted)";
    sortInfo.style.fontSize = "0.9em";
    sortInfo.setText("스크립트를 드래그하여 메뉴 순서를 변경할 수 있습니다.");

    const scriptListDiv = containerEl.createDiv("script-list");

    this.plugin.settings.scripts.forEach((script, index) => {
      this.renderScriptItem(
        scriptListDiv,
        script,
        index,
        this.plugin.settings.scripts.length,
      );
    });
  }

  renderEmptyScriptsMessage(containerEl) {
    const emptyMessage = containerEl.createDiv();
    emptyMessage.style.textAlign = "center";
    emptyMessage.style.padding = "40px 20px";
    emptyMessage.style.color = "var(--text-muted)";

    const iconDiv = emptyMessage.createDiv();
    iconDiv.style.fontSize = "32px";
    iconDiv.style.marginBottom = "10px";
    iconDiv.setText("📝");

    emptyMessage.createEl("div", { text: "등록된 스크립트가 없습니다." });
    emptyMessage.createEl("div", {
      text: '"스크립트 추가" 버튼을 누르세요.',
    });
  }

  renderScriptItem(container, script, index, totalItems) {
    const scriptDiv = container.createDiv("script-item");
    scriptDiv.style.display = "flex";
    scriptDiv.style.margin = "5px 0";
    scriptDiv.style.padding = "10px";
    scriptDiv.style.border = "1px solid var(--background-modifier-border)";
    scriptDiv.style.borderRadius = "4px";
    scriptDiv.style.background = "var(--background-secondary)";
    scriptDiv.style.cursor = "grab";

    if (script.color) {
      scriptDiv.style.borderLeft = `4px solid ${script.color}`;
    }

    const dragHandleDiv = scriptDiv.createDiv("drag-handle");
    dragHandleDiv.innerHTML = "⋮⋮";
    dragHandleDiv.style.marginRight = "10px";
    dragHandleDiv.style.color = "var(--text-muted)";
    dragHandleDiv.style.display = "flex";
    dragHandleDiv.style.alignItems = "center";

    const infoDiv = scriptDiv.createDiv("script-info");
    infoDiv.style.flex = "1";

    const nameEl = infoDiv.createEl("div");
    nameEl.style.fontWeight = "bold";
    nameEl.style.marginBottom = "5px";

    if (script.displayName && script.displayName !== script.name) {
      nameEl.innerHTML = `${script.name} <span style="color: var(--text-muted); font-weight: normal;">(버튼: ${script.displayName})</span>`;
    } else {
      nameEl.textContent = script.name;
    }

    const previewEl = infoDiv.createEl("div");
    previewEl.style.fontSize = "0.8em";
    previewEl.style.color = "var(--text-muted)";
    previewEl.style.whiteSpace = "nowrap";
    previewEl.style.overflow = "hidden";
    previewEl.style.textOverflow = "ellipsis";

    const previewCode = script.code.replace(/\n/g, " ").slice(0, 50);
    previewEl.setText(previewCode + (script.code.length > 50 ? "..." : ""));

    const buttonsDiv = scriptDiv.createDiv("script-buttons");
    buttonsDiv.style.display = "flex";
    buttonsDiv.style.gap = "5px";
    buttonsDiv.style.alignItems = "center";

    const editButton = buttonsDiv.createEl("button", { text: "편집" });
    editButton.classList.add("mod-cta");
    editButton.addEventListener("click", () => {
      this.openScriptEditor(script);
    });

    const deleteButton = buttonsDiv.createEl("button", { text: "삭제" });
    deleteButton.addEventListener("click", async () => {
      const confirmed = confirm(
        `'${script.name}' 스크립트를 삭제하시겠습니까?`,
      );
      if (confirmed) {
        this.plugin.settings.scripts = this.plugin.settings.scripts.filter(
          (s) => s.id !== script.id,
        );
        await this.plugin.saveSettings();
        this.display();
      }
    });

    const testButton = buttonsDiv.createEl("button", { text: "테스트" });
    testButton.addEventListener("click", () => {
      new ScriptTestingModal(this.app, this.plugin, script).open();
    });

    this.setupDragAndDrop(scriptDiv, script);
  }

  setupDragAndDrop(scriptDiv, script) {
    scriptDiv.setAttribute("draggable", "true");
    scriptDiv.dataset.scriptId = script.id;

    scriptDiv.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", script.id);
      scriptDiv.style.opacity = "0.5";
    });

    scriptDiv.addEventListener("dragend", () => {
      scriptDiv.style.opacity = "1";
    });

    scriptDiv.addEventListener("dragover", (e) => {
      e.preventDefault();
      scriptDiv.style.background = "var(--background-modifier-hover)";
    });

    scriptDiv.addEventListener("dragleave", () => {
      scriptDiv.style.background = "var(--background-secondary)";
    });

    scriptDiv.addEventListener("drop", async (e) => {
      e.preventDefault();
      scriptDiv.style.background = "var(--background-secondary)";

      const draggedId = e.dataTransfer.getData("text/plain");
      const dropTargetId = script.id;

      if (draggedId !== dropTargetId) {
        const scripts = this.plugin.settings.scripts;
        const draggedIndex = scripts.findIndex((s) => s.id === draggedId);
        const dropTargetIndex = scripts.findIndex((s) => s.id === dropTargetId);

        const [removed] = scripts.splice(draggedIndex, 1);
        scripts.splice(dropTargetIndex, 0, removed);

        await this.plugin.saveSettings();
        this.display();
      }
    });
  }

  openScriptEditor(script) {
    new ScriptEditorModal(
      this.app,
      this.plugin,
      script,
      async (updatedScript) => {
        const index = this.plugin.settings.scripts.findIndex(
          (s) => s.id === script.id,
        );
        if (index >= 0) {
          this.plugin.settings.scripts[index] = updatedScript;
          await this.plugin.saveSettings();
          this.display();
        }
      },
    ).open();
  }
}

module.exports = SnapScriptPlugin;
