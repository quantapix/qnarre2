/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { InputType } from 'zlib';
import { Message } from './messages';

export interface FunctionContentEncoder {
	name: string;
	encode(input: InputType): Promise<Buffer>;
}

export interface StreamContentEncoder {
	name: string;
	create(): NodeJS.WritableStream;
}

export type ContentEncoder = FunctionContentEncoder | (FunctionContentEncoder & StreamContentEncoder);

export interface FunctionContentDecoder {
	name: string;
	decode(buffer: Buffer): Promise<Buffer>;
}

export interface StreamContentDecoder {
	name: string;
	create(): NodeJS.WritableStream;
}

export type ContentDecoder = FunctionContentDecoder | (FunctionContentDecoder & StreamContentDecoder);

export interface ContentTypeEncoderOptions {
	charset: BufferEncoding;
}

export interface FunctionContentTypeEncoder {
	name: string;
	encode(msg: Message, options: ContentTypeEncoderOptions): Promise<Buffer>;
}

export interface StreamContentTypeEncoder {
	name: string;
	create(options: ContentTypeEncoderOptions): NodeJS.WritableStream;
}

export type ContentTypeEncoder = FunctionContentTypeEncoder | (FunctionContentTypeEncoder & StreamContentTypeEncoder);

export interface ContentTypeDecoderOptions {
	charset: BufferEncoding;
}

export interface FunctionContentTypeDecoder {
	name: string;
	decode(buffer: Buffer, options: ContentTypeDecoderOptions): Promise<Message>
}

export interface StreamContentTypeDecoder {
	name: string;
	create(options: ContentTypeDecoderOptions): NodeJS.WritableStream;
}

export type ContentTypeDecoder = FunctionContentTypeDecoder | (FunctionContentTypeDecoder & StreamContentTypeDecoder);

interface Named {
	name: string;
}

export namespace Encodings {

	export function getEncodingHeaderValue(encodings: Named[]): string | undefined {
		if (encodings.length === 1) {
			return encodings[0].name;
		}
		const distribute = encodings.length - 1;
		if (distribute > 1000) {
			throw new Error(`Quality value can only have three decimal digits but trying to distribute ${encodings.length} elements.`);
		}
		const digits =  Math.ceil(Math.log10(distribute));
		const factor = Math.pow(10,digits);
		const diff = Math.floor((1 / distribute) * factor) / factor;

		const result: string[] = [];
		let q = 1;
		for (const encoding of encodings) {
			result.push(`${encoding.name};q=${q === 1 || q === 0 ? q.toFixed(0) : q.toFixed(digits)}`);
			q = q - diff;
		}
		return result.join(', ');
	}

	export function parseEncodingHeaderValue(value: string): string[] {
		const map: Map<number, string[]> = new Map();
		const encodings = value.split(/\s*,\s*/);
		for (const value of encodings) {
			const [encoding, q] = parseEncoding(value);
			if (encoding === '*') {
				continue;
			}
			let values = map.get(q);
			if (values === undefined) {
				values = [];
				map.set(q, values);
			}
			values.push(encoding);
		}
		const keys = Array.from(map.keys());
		keys.sort((a, b) => b - a);
		const result: string[] = [];
		for (const key of keys) {
			result.push(...map.get(key)!);
		}
		return result;
	}

	function parseEncoding(value: string): [string, number] {
		let q: number = 1;
		let encoding: string;
		const index = value.indexOf(';q=');
		if (index !== -1) {
			const parsed = parseFloat(value.substr(index));
			if (parsed !== NaN) {
				q = parsed;
			}
			encoding = value.substr(0, index);
		} else {
			encoding = value;
		}
		return [encoding, q];
	}
}