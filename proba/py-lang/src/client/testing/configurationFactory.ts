// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { inject, injectable } from 'inversify';
import { Uri } from 'vscode';
import { Product } from '../common/types';
import { IServiceContainer } from '../ioc/types';
import * as nose from './nosetest/testConfigurationManager';
import * as pytest from './pytest/testConfigurationManager';
import { ITestConfigSettingsService, ITestConfigurationManager, ITestConfigurationManagerFactory } from './types';
import * as unittest from './unittest/testConfigurationManager';

@injectable()
export class TestConfigurationManagerFactory implements ITestConfigurationManagerFactory {
    constructor(@inject(IServiceContainer) private serviceContainer: IServiceContainer) {}
    public create(wkspace: Uri, product: Product, cfg?: ITestConfigSettingsService): ITestConfigurationManager {
        switch (product) {
            case Product.unittest: {
                return new unittest.ConfigurationManager(wkspace, this.serviceContainer, cfg);
            }
            case Product.pytest: {
                return new pytest.ConfigurationManager(wkspace, this.serviceContainer, cfg);
            }
            case Product.nosetest: {
                return new nose.ConfigurationManager(wkspace, this.serviceContainer, cfg);
            }
            default: {
                throw new Error('Invalid test configuration');
            }
        }
    }
}
