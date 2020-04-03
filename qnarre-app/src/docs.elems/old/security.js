/**
@license
Copyright 2019 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="iron-meta"><template></template></dom-module><dom-module id="iron-iconset-svg"><template></template></dom-module><dom-module id="fade-in-animation"><template></template></dom-module><dom-module id="paper-menu-grow-width-animation"><template></template></dom-module><dom-module id="paper-menu-grow-height-animation"><template></template></dom-module><dom-module id="paper-menu-shrink-width-animation"><template></template></dom-module><dom-module id="paper-menu-shrink-height-animation"><template></template></dom-module><dom-module id="fade-out-animation"><template></template></dom-module><dom-module id="array-selector"><template></template></dom-module>`;
document.head.appendChild($_documentContainer.content);
window.Polymer = {strictTemplatePolicy: true};

/* Below components violate the strictTemplatePolicy. They do not provide a dom-module
  or a template inside the dom-module as they are functional components. We define their
  empty template here to satisfy the strictTemplatePolicy. Note: if there are template
  defined in their respective component, it will throw strictTemplatePolicy violation at
  the runtime for having duplicate dom-module. */
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
;
