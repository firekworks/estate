import test from 'node:test';
import assert from 'node:assert/strict';
import {humanError} from '../src/lib/estate-errors.ts';
test('permission and provider internals never leak through UI errors',()=>{
 for(const error of [{code:'42501',message:'permission denied for table estate_comparables'},new Error('SQL query with sensitive detail'),{message:'Upstream secret'}])assert.doesNotMatch(humanError(error),/permission denied|SQL|secret|estate_comparables/);
 assert.match(humanError({code:'invalid_credentials'}),/contraseña/);
});
