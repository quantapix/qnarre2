const {expect} = chai;

declare function fixture(id: string): void;
declare const Polymer: any;

function checkSlottedUnderAncestor(element: Element, ancestor: Element) {
  expect(!!element.assignedSlot).to.be.true;

  const slot = element.assignedSlot as Element;
  const isContained = Polymer.dom(ancestor).deepContains(slot);
  expect(isContained).to.be.true;
}

describe('tf-tensorboard tests', () => {
  window.HTMLImports.whenReady(() => {
    let tensorboard: any;
    beforeEach(function() {
      tensorboard = fixture('tensorboardFixture');
      tensorboard.demoDir = 'data';
      tensorboard.autoReloadEnabled = false;
    });

    it('renders injected content', function() {
      const overview = tensorboard.querySelector('#custom-overview');
      const contentPane = tensorboard.$$('#content-pane');
      checkSlottedUnderAncestor(overview, contentPane);

      const headerItem1 = tensorboard.querySelector('#custom-header-item1');
      const headerItem2 = tensorboard.querySelector('#custom-header-item2');
      const header = tensorboard.$$('.header');
      checkSlottedUnderAncestor(headerItem1, header);
      checkSlottedUnderAncestor(headerItem2, header);
    });

    // TODO(psybuzz): Restore/remove these old tests, which fail due to broken
    // DOM ids that changed. Previously this folder's tests did not run.
    xit('reloads the active dashboard on request', done => {
      tensorboard.$.tabs.set('selected', 'scalars');
      setTimeout(() => {
        let called = false;
        tensorboard._selectedDashboardComponent().reload = () => {
          called = true;
        };
        tensorboard.reload();
        chai.assert.isTrue(called, 'reload was called');
        done();
      });
    });

    // TODO(psybuzz): Restore/remove these old tests, which fail due to broken
    // DOM ids that changed. Previously this folder's tests did not run.
    xdescribe('top right global icons', function() {
      it('Clicking the reload button will call reload', function() {
        let called = false;
        tensorboard.reload = function() {
          called = true;
        };
        tensorboard.$$('#reload-button').click();
        chai.assert.isTrue(called);
      });

      it('settings pane is hidden', function() {
        chai.assert.equal(tensorboard.$.settings.style['display'], 'none');
      });

      it('settings icon button opens the settings pane', function(done) {
        tensorboard.$$('#settings-button').click();
        // This test is a little hacky since we depend on polymer's
        // async behavior, which is difficult to predict.

        // keep checking until the panel is visible. error with a timeout if it
        // is broken.
        function verify() {
          if (tensorboard.$.settings.style['display'] !== 'none') {
            done();
          } else {
            setTimeout(verify, 3); // wait and see if it becomes true
          }
        }
        verify();
      });

      it('Autoreload checkbox toggle works', function() {
        let checkbox = tensorboard.$$('#auto-reload-checkbox');
        chai.assert.equal(checkbox.checked, tensorboard.autoReloadEnabled);
        let oldValue = checkbox.checked;
        checkbox.click();
        chai.assert.notEqual(oldValue, checkbox.checked);
        chai.assert.equal(checkbox.checked, tensorboard.autoReloadEnabled);
      });

      it('Autoreload checkbox contains correct interval info', function() {
        let checkbox = tensorboard.$$('#auto-reload-checkbox');
        let timeInSeconds = tensorboard.autoReloadIntervalSecs + 's';
        chai.assert.include(checkbox.innerText, timeInSeconds);
      });
    });
  });
});
