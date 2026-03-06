/**
 * UML diagram editor – visualize code as UML. Vanilla JS, no build.
 */

(function () {
	'use strict';

	const canvasEl = document.getElementById('canvas');
	const ctx = canvasEl.getContext('2d');

	let boxes = [];
	let relationships = [];
	let selectedBoxId = null;
	let dragStart = null;
	let scale = 1;
	let panX = 0, panY = 0;
	let isPanning = false;
	let lastPointer = { x: 0, y: 0 };
	let nextId = 1;
	let relationshipFrom = undefined;
	let editingBoxId = null;
	const TITLE_HEIGHT = 28;
	const LINE_HEIGHT = 16;
	const MIN_BODY_LINES = 4;
	const MIN_BODY_HEIGHT = MIN_BODY_LINES * LINE_HEIGHT;

	function resizeCanvas() {
		const wrap = canvasEl.parentElement;
		canvasEl.width = wrap.clientWidth;
		canvasEl.height = wrap.clientHeight;
		render();
	}
	window.addEventListener('resize', resizeCanvas);
	resizeCanvas();

	function boxId() {
		return 'box-' + (nextId++);
	}

	function getBox(id) {
		return boxes.find(b => b.id === id);
	}

	function pointerOnCanvas(e) {
		const rect = canvasEl.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left - panX) / scale,
			y: (e.clientY - rect.top - panY) / scale
		};
	}

	function hitTestBox(x, y) {
		for (let i = boxes.length - 1; i >= 0; i--) {
			const b = boxes[i];
			if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
				return b;
			}
		}
		return null;
	}

	function distToSegment(px, py, ax, ay, bx, by) {
		const vx = bx - ax;
		const vy = by - ay;
		const wx = px - ax;
		const wy = py - ay;
		const d2 = vx * vx + vy * vy;
		let t = d2 === 0 ? 0 : (wx * vx + wy * vy) / d2;
		t = Math.max(0, Math.min(1, t));
		const cx = ax + t * vx;
		const cy = ay + t * vy;
		return Math.hypot(px - cx, py - cy);
	}

	function getRelationshipSegments(r) {
		const from = getBox(r.from);
		const to = getBox(r.to);
		if (!from || !to) return [];
		const x1 = from.x + from.w / 2;
		const y1 = from.y + from.h;
		const x2 = to.x + to.w / 2;
		const y2 = to.y;
		const midY = (y1 + y2) / 2;
		return [
			[x1, y1, x1, midY],
			[x1, midY, x2, midY],
			[x2, midY, x2, y2]
		];
	}

	const RELATIONSHIP_HIT_THRESHOLD = 8;

	function hitTestRelationship(x, y) {
		for (let i = relationships.length - 1; i >= 0; i--) {
			const r = relationships[i];
			const segs = getRelationshipSegments(r);
			for (const [ax, ay, bx, by] of segs) {
				if (distToSegment(x, y, ax, ay, bx, by) <= RELATIONSHIP_HIT_THRESHOLD) {
					return { relationship: r, index: i };
				}
			}
		}
		return null;
	}

	function getBodyLines(b) {
		if (b.bodyText !== undefined && b.bodyText !== null) {
			const text = String(b.bodyText).trim();
			return text ? text.split(/\r?\n/) : [];
		}
		const legacy = [].concat(b.attrs || [], b.methods || []);
		return legacy;
	}

	function updateBoxHeight(b) {
		const lines = getBodyLines(b);
		const lineCount = Math.max(1, lines.length);
		b.h = TITLE_HEIGHT + Math.max(MIN_BODY_HEIGHT, lineCount * LINE_HEIGHT);
	}

	function wrapLine(ctx, text, maxWidth) {
		const lines = [];
		const words = text.split(/(\s+)/);
		let current = '';
		for (let i = 0; i < words.length; i++) {
			const word = words[i];
			const next = current + word;
			if (ctx.measureText(next.trim()).width <= maxWidth) {
				current = next;
			} else {
				if (current.trim()) {
					lines.push(current.trim());
				}
				current = word.trim() || word;
				while (current && ctx.measureText(current).width > maxWidth) {
					let fit = '';
					for (const c of current) {
						if (ctx.measureText(fit + c).width <= maxWidth) {
							fit += c;
						} else break;
					}
					if (fit) {
						lines.push(fit);
						current = current.slice(fit.length);
					} else {
						lines.push(current);
						current = '';
					}
				}
			}
		}
		if (current.trim()) {
			lines.push(current.trim());
		}
		return lines;
	}

	function drawBox(b) {
		const isInterface = b.type === 'interface';
		const bodyLines = getBodyLines(b);
		const isPendingRelationship = relationshipFrom === b.id;
		ctx.save();
		ctx.translate(b.x, b.y);
		if (isPendingRelationship) {
			ctx.globalAlpha = 0.5;
		}
		ctx.strokeStyle = selectedBoxId === b.id ? '#007acc' : (isPendingRelationship ? '#555' : '#3c3c3c');
		ctx.lineWidth = selectedBoxId === b.id ? 2 : 1;
		ctx.fillStyle = '#2d2d30';
		ctx.beginPath();
		if (ctx.roundRect) {
			ctx.roundRect(0, 0, b.w, b.h, 4);
		} else {
			ctx.rect(0, 0, b.w, b.h);
		}
		ctx.fill();
		ctx.stroke();
		if (isInterface) {
			ctx.strokeStyle = '#4ec9b0';
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(b.w, 0);
			ctx.stroke();
		}
		ctx.fillStyle = '#d4d4d4';
		ctx.font = '600 14px sans-serif';
		ctx.textAlign = 'center';
		const title = (isInterface ? '«interface» ' : '') + (b.name || 'Item');
		ctx.fillText(title, b.w / 2, 22);
		ctx.strokeStyle = '#3c3c3c';
		ctx.beginPath();
		ctx.moveTo(0, TITLE_HEIGHT);
		ctx.lineTo(b.w, TITLE_HEIGHT);
		ctx.stroke();
		if (editingBoxId !== b.id) {
			ctx.save();
			ctx.beginPath();
			ctx.rect(0, TITLE_HEIGHT, b.w, b.h - TITLE_HEIGHT);
			ctx.clip();
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'left';
			ctx.fillStyle = '#d4d4d4';
			const maxWidth = b.w - 16;
			const wrappedLines = [];
			for (let i = 0; i < bodyLines.length; i++) {
				const line = bodyLines[i];
				if (ctx.measureText(line).width <= maxWidth) {
					wrappedLines.push(line);
				} else {
					wrappedLines.push(...wrapLine(ctx, line, maxWidth));
				}
			}
			let dy = 42;
			const maxY = b.h - LINE_HEIGHT / 2;
			let lastLineIndex = -1;
			for (let i = 0; i < wrappedLines.length && dy <= maxY; i++) {
				ctx.fillText(wrappedLines[i], 8, dy);
				lastLineIndex = i;
				dy += LINE_HEIGHT;
			}
			if (lastLineIndex >= 0 && lastLineIndex < wrappedLines.length - 1 && dy <= maxY) {
				ctx.fillText('…', 8, dy);
			}
			ctx.restore();
		}
		ctx.restore();
	}

	function drawRelationship(r) {
		const from = getBox(r.from);
		const to = getBox(r.to);
		if (!from || !to) return;
		const x1 = from.x + from.w / 2;
		const y1 = from.y + from.h;
		const x2 = to.x + to.w / 2;
		const y2 = to.y;
		ctx.save();
		ctx.strokeStyle = '#858585';
		ctx.lineWidth = 1.5;
		ctx.setLineDash([6, 4]);
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x1, (y1 + y2) / 2);
		ctx.lineTo(x2, (y1 + y2) / 2);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.restore();
	}

	function render() {
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillStyle = '#252526';
		ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
		ctx.restore();
		ctx.save();
		ctx.translate(panX, panY);
		ctx.scale(scale, scale);
		relationships.forEach(drawRelationship);
		boxes.forEach(drawBox);
		ctx.restore();
		if (editingBoxId) {
			positionInlineEditor();
		}
	}

	function addBox(type, x, y) {
		const w = 160;
		const h = 100;
		x = Math.max(0, x - w / 2);
		y = Math.max(0, y - h / 2);
		const b = {
			id: boxId(),
			type: type || 'class',
			name: 'Item',
			x, y, w, h,
			bodyText: ''
		};
		boxes.push(b);
		selectedBoxId = b.id;
		render();
	}

	function boxToWrapCoords(b) {
		return {
			left: panX + b.x * scale,
			top: panY + (b.y + TITLE_HEIGHT) * scale,
			width: b.w * scale,
			height: (b.h - TITLE_HEIGHT) * scale
		};
	}

	function positionInlineEditor() {
		const b = getBox(editingBoxId);
		const ta = document.getElementById('inline-body');
		if (!b || !ta) return;
		const r = boxToWrapCoords(b);
		ta.style.left = r.left + 'px';
		ta.style.top = r.top + 'px';
		ta.style.width = r.width + 'px';
		ta.style.height = r.height + 'px';
	}

	function startInlineEdit(boxId) {
		const b = getBox(boxId);
		if (!b) return;
		editingBoxId = boxId;
		const ta = document.getElementById('inline-body');
		ta.value = b.bodyText || '';
		ta.classList.add('visible');
		positionInlineEditor();
		ta.focus();
	}

	function stopInlineEdit(save) {
		if (!editingBoxId) return;
		const ta = document.getElementById('inline-body');
		if (save) {
			const b = getBox(editingBoxId);
			if (b) {
				b.bodyText = ta.value;
				updateBoxHeight(b);
			}
		}
		editingBoxId = null;
		ta.classList.remove('visible');
		render();
	}

	function showContextMenu(screenX, screenY, canvasX, canvasY, hitBox, hitRelationship) {
		const menu = document.getElementById('context-menu');
		const btn = document.getElementById('context-menu-action');
		menu.hidden = false;
		menu.style.left = screenX + 'px';
		menu.style.top = screenY + 'px';
		menu._pendingX = canvasX;
		menu._pendingY = canvasY;
		menu._pendingBoxId = hitBox ? hitBox.id : null;
		menu._pendingRelationshipIndex = hitRelationship != null ? hitRelationship.index : -1;
		if (hitBox) {
			btn.textContent = 'Add relationship';
			btn.dataset.action = 'relationship';
		} else if (hitRelationship != null) {
			btn.textContent = 'Remove relationship';
			btn.dataset.action = 'remove-relationship';
		} else {
			btn.textContent = 'Add item';
			btn.dataset.action = 'item';
		}
	}

	function hideContextMenu() {
		const menu = document.getElementById('context-menu');
		menu.hidden = true;
	}

	canvasEl.addEventListener('contextmenu', function (e) {
		e.preventDefault();
		const p = pointerOnCanvas(e);
		const hitBox = hitTestBox(p.x, p.y);
		const hitRelationship = hitBox ? null : hitTestRelationship(p.x, p.y);
		showContextMenu(e.clientX, e.clientY, p.x, p.y, hitBox, hitRelationship);
	});

	document.getElementById('context-menu').addEventListener('click', function (e) {
		const btn = e.target.closest('button');
		if (!btn || btn.id !== 'context-menu-action') return;
		const menu = document.getElementById('context-menu');
		const x = menu._pendingX;
		const y = menu._pendingY;
		const boxId = menu._pendingBoxId;
		const relationshipIndex = menu._pendingRelationshipIndex;
		const action = btn.dataset.action;
		hideContextMenu();
		if (action === 'item') {
			addBox('class', x, y);
		} else if (action === 'relationship' && boxId) {
			relationshipFrom = boxId;
		} else if (action === 'remove-relationship' && relationshipIndex >= 0) {
			relationships.splice(relationshipIndex, 1);
			render();
		}
	});

	document.addEventListener('pointerdown', function (e) {
		const menu = document.getElementById('context-menu');
		if (menu.contains(e.target)) return;
		hideContextMenu();
	});

	canvasEl.addEventListener('dblclick', function (e) {
		const p = pointerOnCanvas(e);
		const hit = hitTestBox(p.x, p.y);
		if (hit) {
			e.preventDefault();
			startInlineEdit(hit.id);
		}
	});

	const inlineBody = document.getElementById('inline-body');
	inlineBody.addEventListener('input', function () {
		const b = getBox(editingBoxId);
		if (!b) return;
		b.bodyText = inlineBody.value;
		updateBoxHeight(b);
		positionInlineEditor();
		render();
	});
	inlineBody.addEventListener('blur', function () {
		stopInlineEdit(true);
	});
	inlineBody.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') {
			inlineBody.blur();
		}
	});

	canvasEl.addEventListener('pointerdown', function (e) {
		if (editingBoxId) return;
		const p = pointerOnCanvas(e);
		if (e.button !== 0) return;
		const hit = hitTestBox(p.x, p.y);
		if (relationshipFrom !== undefined) {
			if (hit && relationshipFrom !== hit.id) {
				relationships.push({ from: relationshipFrom, to: hit.id });
				relationshipFrom = undefined;
			} else if (!hit) {
				relationshipFrom = undefined;
			}
			render();
			return;
		}
		selectedBoxId = hit ? hit.id : null;
		if (hit) {
			dragStart = { x: p.x - hit.x, y: p.y - hit.y };
		} else {
			isPanning = true;
			lastPointer = { x: e.clientX, y: e.clientY };
		}
		render();
	});

	canvasEl.addEventListener('pointermove', function (e) {
		if (editingBoxId) return;
		const p = pointerOnCanvas(e);
		if (isPanning) {
			panX += e.clientX - lastPointer.x;
			panY += e.clientY - lastPointer.y;
			lastPointer = { x: e.clientX, y: e.clientY };
			render();
			return;
		}
		if (dragStart && selectedBoxId) {
			const b = getBox(selectedBoxId);
			if (b) {
				b.x = p.x - dragStart.x;
				b.y = p.y - dragStart.y;
				render();
			}
		}
	});

	canvasEl.addEventListener('pointerup', function () {
		dragStart = null;
		isPanning = false;
	});

	canvasEl.addEventListener('pointerleave', function () {
		dragStart = null;
		isPanning = false;
	});

	canvasEl.addEventListener('wheel', function (e) {
		if (editingBoxId) return;
		e.preventDefault();
		const rect = canvasEl.getBoundingClientRect();
		const worldX = (e.clientX - rect.left - panX) / scale;
		const worldY = (e.clientY - rect.top - panY) / scale;
		const factor = e.deltaY > 0 ? 0.9 : 1.1;
		scale = Math.max(0.25, Math.min(2, scale * factor));
		panX = e.clientX - rect.left - worldX * scale;
		panY = e.clientY - rect.top - worldY * scale;
		render();
	}, { passive: false });

	// Public API: add items, export data, load diagram
	window.umlEditor = {
		get boxes() { return boxes; },
		get relationships() { return relationships; },
		addBox(b) { boxes.push(b); render(); },
		addRelationship(r) { relationships.push(r); render(); },
		clear() { boxes = []; relationships = []; selectedBoxId = null; render(); },
		load(data) {
			boxes = (data.boxes || []).map(b => ({ ...b }));
			relationships = (data.relationships || []).map(r => ({ ...r }));
			selectedBoxId = null;
			render();
		},
		exportData() {
			return { boxes: boxes.map(b => ({ ...b })), relationships: relationships.map(r => ({ ...r })) };
		},
		boxId
	};
})();
