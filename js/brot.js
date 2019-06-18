/* Julian Raya 2013*/

const doc = document;
const win = window;

const xtnd = function xtnd() {
  for (let i = 1; i < arguments.length; i++) {
    for (const key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key)) {
        arguments[0][key] = arguments[i][key];
      }
    }
  }
  return arguments[0];
};

function BrotCtrl() {
  this.elems = {};
  xtnd(this.elems, {
    z: doc.getElementById('zoom'),
    x: doc.getElementById('xOffset'),
    y: doc.getElementById('yOffset'),
    i: doc.getElementById('iterations'),
    t: doc.getElementById('renderTime')
  });
}

xtnd(BrotCtrl.prototype, {
  Z() {
    return parseInt(this.elems.z.value);
  },
  X() {
    return parseFloat(this.elems.x.value);
  },
  Y() {
    return parseFloat(this.elems.y.value);
  },
  I() {
    return parseInt(this.elems.i.value);
  },
  T() {
    return parseInt(this.elems.t.value);
  },

  dsbl() {
    for (const key in this.elems) {
      if (this.elems.hasOwnProperty(key)) {
        this.elems[key].setAttribute('disabled', 'disabled');
      }
    }
  },
  enbl() {
    for (const key in this.elems) {
      if (this.elems.hasOwnProperty(key)) {
        this.elems[key].removeAttribute('disabled');
      }
    }
  },
  setSteps() {
    const zoom = this.Z();
    const cStep = 0.5 / zoom;
    const zStep = Math.abs(Math.ceil(zoom / 10) || 1);

    if (cStep) {
      this.elems.x.setAttribute('step', `${cStep}`);
      this.elems.y.setAttribute('step', `${cStep}`);
    }

    this.elems.z.setAttribute('step', `${zStep}`);
  },
  setEvents() {
    for (const key in this.elems) {
      if (this.elems.hasOwnProperty(key)) {
        this.elems[key].addEventListener('change', () => {
          win.brot.update();
        });
      }
    }

    const Key = { UP: 38, RIGHT: 39, DOWN: 40, LEFT: 37 };

    const ctrl = this;
    win.addEventListener('keydown', function({ ctrlKey, shiftKey, keyCode }) {
      if (ctrlKey || shiftKey) {
        switch (keyCode) {
          case Key.UP:
            ctrl.elems.z.value = ctrl.Z() + parseFloat(ctrl.elems.z.step);
            break;
          case Key.DOWN:
            ctrl.elems.z.value = ctrl.Z() - parseFloat(ctrl.elems.z.step);
            break;
          case Key.LEFT:
            ctrl.elems.i.value = ctrl.I() - parseFloat(ctrl.elems.i.step);
            break;
          case Key.RIGHT:
            ctrl.elems.i.value = ctrl.I() + parseFloat(ctrl.elems.i.step);
            break;
        }
      } else {
        switch (keyCode) {
          case Key.UP:
            ctrl.elems.y.value = ctrl.Y() + parseFloat(ctrl.elems.y.step);
            break;
          case Key.DOWN:
            ctrl.elems.y.value = ctrl.Y() - parseFloat(ctrl.elems.y.step);
            break;
          case Key.LEFT:
            ctrl.elems.x.value = ctrl.X() + parseFloat(ctrl.elems.x.step);
            break;
          case Key.RIGHT:
            ctrl.elems.x.value = ctrl.X() - parseFloat(ctrl.elems.x.step);
            break;
        }
      }

      if ([37, 38, 39, 40].includes(keyCode)) {
        this.brot.update();
      }
    });
  }
});

function BrotPanel(width, height, cyMin, cyMax, cxMin, cxMax, maxI) {
  this.settings = {
    width: Math.ceil(width),
    height,
    cyMin,
    cyMax,
    cxMin,
    cxMax,
    maxI
  };

  this.cvs = document.createElement('canvas');
  this.ctx = this.cvs.getContext('2d');
  this.worker = new Worker('js/calc.js');

  const panel = this;
  this.worker.onmessage = ({ data }) => {
    panel.cvs.width = width;
    panel.cvs.height = height;
    panel.ctx.putImageData(data.imgData, 0, 0);
    panel.onFree();
  };
}

xtnd(BrotPanel.prototype, {
  work() {
    this.settings.imgData = this.ctx.createImageData(
      this.settings.width,
      this.settings.height
    );
    this.worker.postMessage(this.settings);
  },
  onFree() {}
});

function Brot() {
  this.panels = [];
  this.panelWidth = this.width / this.numWorkers;
  this.cx = {};
  this.cy = {};
  this.ctrl = new BrotCtrl();
  this.ctrl.brot = this;
}

xtnd(Brot.prototype, {
  width: win.innerWidth,
  height: win.innerHeight,
  maxI: 200,
  numWorkers: 6,
  working: false,
  cxCy() {
    const offY = this.ctrl.Y();
    const offX = this.ctrl.X();
    const zoom = this.ctrl.Z();
    this.cx.min = (-2.0 * (this.width / this.height)) / zoom - offX;
    this.cx.max = (2.0 * (this.width / this.height)) / zoom - offX;
    this.cx.step = (this.cx.max - this.cx.min) / this.numWorkers;
    (this.cy.min = -2.0 / zoom - offY), (this.cy.max = 2.0 / zoom - offY);
  },
  init(contentDiv) {
    this.cxCy();
    for (let i = 0; i < this.numWorkers; i++) {
      const thisCxMin = this.cx.min + this.cx.step * i;
      const thisCxMax = thisCxMin + this.cx.step;

      const panel = (this.panels[i] = new BrotPanel(
        this.panelWidth,
        this.height,
        this.cy.min,
        this.cy.max,
        thisCxMin,
        thisCxMax,
        this.maxI
      ));
      panel.work();
      panel.cvs.style.left = `${i * this.panelWidth}px`;
      contentDiv.appendChild(panel.cvs);
    }

    this.ctrl.setEvents();
    this.update();
  },
  update() {
    if (!this.working) {
      let numFree = 0;
      const rendStart = Date.now();
      const b = this;

      this.cxCy();
      this.ctrl.dsbl();
      this.ctrl.setSteps();

      this.working = true;

      for (let i = 0; i < this.panels.length; i++) {
        const panel = this.panels[i];
        panel.settings.cxMin = this.cx.min + this.cx.step * i;
        panel.settings.cxMax = panel.settings.cxMin + this.cx.step;
        panel.settings.cyMin = this.cy.min;
        panel.settings.cyMax = this.cy.max;
        panel.settings.maxI = this.ctrl.I();
        panel.settings.zoom = this.ctrl.Z();

        panel.onFree = () => {
          if (++numFree == b.panels.length) {
            b.ctrl.enbl();
            b.ctrl.elems.t.innerText = `${Date.now() - rendStart}ms`;
            b.working = false;
          }
        };
        panel.work();
      }
    }
  }
});
