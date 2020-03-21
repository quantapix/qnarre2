const {assert} = chai;

describe('ColorScale', function() {
  let ccs: ColorScale;

  beforeEach(function() {
    ccs = new ColorScale();
  });

  it('Returns consistent colors', function() {
    ccs.setDomain(['train', 'eval', 'test']);
    let trainColor = ccs.getColor('train');
    let trainColor2 = ccs.getColor('train');
    assert.equal(trainColor, trainColor2);
  });

  it('Returns consistent colors after new domain', function() {
    ccs.setDomain(['train', 'eval']);
    let trainColor = ccs.getColor('train');
    ccs.setDomain(['train', 'eval', 'test']);
    let trainColor2 = ccs.getColor('train');
    assert.equal(trainColor, trainColor2);
  });

  it('Throws an error if string is not in the domain', function() {
    ccs.setDomain(['red', 'yellow', 'green']);
    assert.throws(() => {
      ccs.getColor('WAT');
    }, 'String WAT was not in the domain.');
  });
});
