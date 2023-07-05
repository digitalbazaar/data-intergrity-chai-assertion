/*!
 * Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
 */
import {
  endpoints as allEndpoints, filterImplementations
} from 'vc-api-test-suite-implementations';
import {createInitialVc, shouldBeBs58, verificationFail} from './helpers.js';
import chai from 'chai';
import {klona} from 'klona';
import {validVc} from './validVc.js';

const should = chai.should();

/**
 * Validates the structure of the "proof" property on a digital document.
 *
 * @param {object} options - Options to use.
 * @param {Map<string,object>} options.implemented - The vendors being tested.
 * @param {Map<string,object>} options.notImplemented - The vendors not being
 *   tested.
 * @param {Array<string>} [options.expectedProofTypes] - An option to specify
 *   the expected proof types. The default value is set to
 *   ['DataIntegrityProof'].
 * @param {boolean} [options.expectedCryptoSuite] - A boolean option to specify
 *   if "cryptosuite" field is expected in the proof or not. The default value
 *   is set to true.
 * @returns {object} Returns the test suite being run.
 */
export function checkDataIntegrityProofFormat({
  implemented, notImplemented, expectedProofTypes = ['DataIntegrityProof'],
  expectedCryptoSuite = true
} = {}) {
  return describe('Data Integrity (issuer)', function() {
    // this will tell the report
    // to make an interop matrix with this suite
    this.matrix = true;
    this.report = true;
    this.implemented = [...implemented.keys()];
    this.notImplemented = [...notImplemented.keys()];
    this.rowLabel = 'Test Name';
    this.columnLabel = 'Issuer';
    for(const [vendorName, {endpoints}] of implemented) {
      if(!endpoints) {
        throw new Error(`Expected ${vendorName} to have endpoints.`);
      }
      describe(vendorName, function() {
        let proofs = [];
        let data;
        before(async function() {
          const [issuer] = endpoints;
          if(!issuer) {
            throw new Error(`Expected ${vendorName} to have an issuer.`);
          }
          data = await createInitialVc({issuer, vc: validVc});
          proofs = Array.isArray(data.proof) ? data.proof : [data.proof];
        });
        it('"proof" field MUST exist at top-level of data object.', function() {
          this.test.cell = {columnId: vendorName, rowId: this.test.title};
          should.exist(data, 'Expected data.');
          should.exist(data.proof, 'Expected proof to be top-level');
          const type = typeof data.proof;
          type.should.be.oneOf(
            ['object', 'array'],
            'Expected proof to be either an object or an array.'
          );
        });
        it('if "proof.id" field exists, it MUST be a valid URL.', function() {
          this.test.cell = {columnId: vendorName, rowId: this.test.title};
          for(const proof of proofs) {
            if(proof.id) {
              let result;
              let err;
              try {
                result = new URL(proof.id);
              } catch(e) {
                err = e;
              }
              should.not.exist(err, 'Expected URL check of the "proof.id" ' +
                'to not error.');
              should.exist(result, 'Expected "proof.id" to be a URL.');
            }
          }
        });
        it('"proof.type" field MUST exist and be a string.', function() {
          this.test.cell = {columnId: vendorName, rowId: this.test.title};
          for(const proof of proofs) {
            proof.should.have.property('type');
            proof.type.should.be.a(
              'string', 'Expected "proof.type" to be a string.');
          }
        });
        it(`"proof.type" field MUST be "${expectedProofTypes.join(',')}".`,
          function() {
            this.test.cell = {columnId: vendorName, rowId: this.test.title};
            for(const proof of proofs) {
              proof.should.have.property('type');
              proof.type.should.be.a(
                'string',
                'Expected "proof.type" to be a string.'
              );
              const hasExpectedType = expectedProofTypes.includes(proof.type);
              hasExpectedType.should.equal(true);
            }
          });
        if(expectedCryptoSuite) {
          it('"proof.cryptosuite" field MUST exist and be a string.',
            function() {
              this.test.cell = {columnId: vendorName, rowId: this.test.title};
              for(const proof of proofs) {
                proof.should.have.property('cryptosuite');
                proof.cryptosuite.should.be.a('string', 'Expected ' +
                  '"cryptosuite" property to be a string.');
              }
            });
        }
        it('"proof.created" field MUST exist and be a valid XMLSCHEMA-11 ' +
          'datetime value.', function() {
          this.test.cell = {columnId: vendorName, rowId: this.test.title};
          for(const proof of proofs) {
            proof.should.have.property('created');
            // check if "created" is a valid ISO 8601 datetime value
            const dateRegex = new RegExp('^(\\d{4})-(0[1-9]|1[0-2])-' +
            '(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):' +
            '([0-5][0-9]):([0-5][0-9]|60)' +
            '(\\.[0-9]+)?(Z|(\\+|-)([01][0-9]|2[0-3]):' +
            '([0-5][0-9]))$', 'i');
            proof.created.should.match(dateRegex);
          }
        });
        it('"proof.verificationMethod" field MUST exist and be a valid URL.',
          function() {
            this.test.cell = {columnId: vendorName, rowId: this.test.title};
            for(const proof of proofs) {
              proof.should.have.property('verificationMethod');
              let result;
              let err;
              try {
                result = new URL(proof.verificationMethod);
              } catch(e) {
                err = e;
              }
              should.not.exist(err, 'Expected URL check of the ' +
                '"verificationMethod" to not error.');
              should.exist(result, 'Expected "verificationMethod" ' +
                'to be a URL');
            }
          });
        it('"proof.proofPurpose" field MUST exist and be a string.',
          function() {
            this.test.cell = {columnId: vendorName, rowId: this.test.title};
            for(const proof of proofs) {
              proof.should.have.property('proofPurpose');
              proof.proofPurpose.should.be.a('string');
            }
          });
        it('"proof.proofValue" field MUST exist and be a string.', function() {
          this.test.cell = {columnId: vendorName, rowId: this.test.title};
          for(const proof of proofs) {
            proof.should.have.property('proofValue');
            proof.proofValue.should.be.a('string');
          }
        });
        it('The "proof.proofValue" field MUST be a multibase-encoded ' +
          'base58-btc encoded value.', function() {
          this.test.cell = {columnId: vendorName, rowId: this.test.title};
          const multibase = 'z';
          proofs.some(proof => {
            const value = proof?.proofValue;
            return value.startsWith(multibase) && shouldBeBs58(value);
          }).should.equal(
            true,
            'Expected "proof.proofValue" to be multibase-encoded base58-btc ' +
            'value.'
          );
        });
        it('if "proof.domain" field exists, it MUST be a string.', function() {
          this.test.cell = {columnId: vendorName, rowId: this.test.title};
          for(const proof of proofs) {
            if(proof.domain) {
              proof.domain.should.be.a('string', 'Expected "proof.domain" ' +
                'to be a string.');
            }
          }
        });
        it('if "proof.challenge" field exists, it MUST be a string.',
          function() {
            this.test.cell = {columnId: vendorName, rowId: this.test.title};
            for(const proof of proofs) {
              if(proof.challenge) {
                // domain must be specified
                should.exist(proof.domain, 'Expected "proof.domain" ' +
                  'to be specified.');
                proof.challenge.should.be.a('string', 'Expected ' +
                  '"proof.challenge" to be a string.');
              }
            }
          });
        it('if "proof.previousProof" field exists, it MUST be a string.',
          function() {
            this.test.cell = {columnId: vendorName, rowId: this.test.title};
            for(const proof of proofs) {
              if(proof.previousProof) {
                proof.previousProof.should.be.a('string', 'Expected ' +
                  '"proof.previousProof" to be a string.');
              }
            }
          });
      });
    } // end for loop
  }); // end describe
}

export function checkDataIntegrityProofVerifyErrors({
  implemented, notImplemented, tag = 'eddsa-2022'
} = {}) {
  return describe('Data Integrity (verifier)', function() {
    // this will tell the report
    // to make an interop matrix with this suite
    this.matrix = true;
    this.report = true;
    this.implemented = [...implemented.keys()];
    this.notImplemented = [...notImplemented.keys()];
    this.rowLabel = 'Test Name';
    this.columnLabel = 'Verifier';
    for(const [vendorName, {endpoints}] of implemented) {
      if(!endpoints) {
        throw new Error(`Expected ${vendorName} to have endpoints.`);
      }
      describe(vendorName, function() {
        let issuedVc;
        const [verifier] = endpoints;
        if(!verifier) {
          throw new Error(`Expected ${vendorName} to have a verifier.`);
        }
        before(async function() {
          // use DB issuer as default issuer to issue a valid VC.
          const {match} = filterImplementations({
            filter: ({key}) => key === 'Digital Bazaar'
          });
          // only use the issuer with the tag specified when
          // checkVerifyProofErrors() is called.
          const {match: matchingIssuer} = allEndpoints.filterByTag({
            implementations: match,
            tags: [tag],
            property: 'issuers'
          });
          const {endpoints: [issuer]} = matchingIssuer.get('Digital Bazaar');
          issuedVc = await createInitialVc({issuer, vc: validVc});
        });
        it('.', function() {
          this.test.cell = {columnId: vendorName, rowId: this.test.title};
        });
        it('If the "proof" field is missing, a MALFORMED error MUST be ' +
          'returned.', async function() {
          this.test.cell = {columnId: vendorName, rowId: this.test.title};
          const credential = klona(issuedVc);
          delete credential.proof;
          await verificationFail({credential, verifier});
        });
      });
    } // end for loop
  }); // end describe
}
