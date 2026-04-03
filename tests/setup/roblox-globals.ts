/**
 * Runtime mocks for Roblox global APIs.
 * Loaded via Jest `setupFiles` before any test module is evaluated.
 */

// ---------------------------------------------------------------------------
// math – augmented with Roblox-specific methods
// ---------------------------------------------------------------------------
(global as any).math = {
	round: (x: number) => Math.round(x),
	floor: (x: number) => Math.floor(x),
	ceil: (x: number) => Math.ceil(x),
	abs: (x: number) => Math.abs(x),
	max: (...args: number[]) => Math.max(...args),
	min: (...args: number[]) => Math.min(...args),
	rad: (degrees: number) => (degrees * Math.PI) / 180,
	deg: (radians: number) => (radians * 180) / Math.PI,
	clamp: (x: number, min: number, max: number) => Math.min(Math.max(x, min), max),
	sin: (x: number) => Math.sin(x),
	cos: (x: number) => Math.cos(x),
	sqrt: (x: number) => Math.sqrt(x),
	huge: Infinity,
	pi: Math.PI,
};

// ---------------------------------------------------------------------------
// Vector3
// ---------------------------------------------------------------------------
class Vector3Impl {
	readonly X: number;
	readonly Y: number;
	readonly Z: number;

	constructor(x = 0, y = 0, z = 0) {
		this.X = x;
		this.Y = y;
		this.Z = z;
	}

	add(other: Vector3Impl): Vector3Impl {
		return new Vector3Impl(this.X + other.X, this.Y + other.Y, this.Z + other.Z);
	}

	sub(other: Vector3Impl): Vector3Impl {
		return new Vector3Impl(this.X - other.X, this.Y - other.Y, this.Z - other.Z);
	}
}

(global as any).Vector3 = Vector3Impl;

// ---------------------------------------------------------------------------
// CFrame – minimal 4×4 affine transform (position + 3×3 rotation matrix).
//   Rotation convention matches Roblox: CFrame.Angles(rx, ry, rz) = Rx·Ry·Rz.
//   For all tests in this suite only Y-axis rotation is exercised, so the
//   rx = rz = 0 fast-path is the important one.
// ---------------------------------------------------------------------------

function applyMatrix3(m: number[], v: number[]): number[] {
	return [
		m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
		m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
		m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
	];
}

function matMul3x3(a: number[], b: number[]): number[] {
	return [
		a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
		a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
		a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
		a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
		a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
		a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
		a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
		a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
		a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
	];
}

class CFrameImpl {
	private _x: number;
	private _y: number;
	private _z: number;
	/**
	 * Row-major 3×3 rotation matrix.
	 * Row i occupies indices [i*3, i*3+1, i*3+2].
	 * applyMatrix3(m, v) computes m·v: result[i] = sum_j m[i*3+j] * v[j].
	 */
	private _m: number[];

	constructor(xOrVec?: number | Vector3Impl, y?: number, z?: number) {
		this._m = [1, 0, 0, 0, 1, 0, 0, 0, 1];
		if (xOrVec instanceof Vector3Impl) {
			this._x = xOrVec.X;
			this._y = xOrVec.Y;
			this._z = xOrVec.Z;
		} else {
			this._x = xOrVec ?? 0;
			this._y = y ?? 0;
			this._z = z ?? 0;
		}
	}

	static Angles(rx: number, ry: number, rz: number): CFrameImpl {
		const result = new CFrameImpl(0, 0, 0);
		const cx = Math.cos(rx),
			sx = Math.sin(rx);
		const cy = Math.cos(ry),
			sy = Math.sin(ry);
		const cz = Math.cos(rz),
			sz = Math.sin(rz);

		if (rx === 0 && rz === 0) {
			// Ry only – common fast path
			result._m = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
		} else {
			// Full Rx · Ry · Rz
			const Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
			const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
			const Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
			result._m = matMul3x3(matMul3x3(Rx, Ry), Rz);
		}
		return result;
	}

	/** Compose: this · other  →  (R1·R2, p1 + R1·p2) */
	mul(other: CFrameImpl): CFrameImpl {
		const result = new CFrameImpl(0, 0, 0);
		result._m = matMul3x3(this._m, other._m);
		const rp = applyMatrix3(this._m, [other._x, other._y, other._z]);
		result._x = this._x + rp[0];
		result._y = this._y + rp[1];
		result._z = this._z + rp[2];
		return result;
	}

	/** Apply this CFrame to a local point → world space. */
	PointToWorldSpace(v: Vector3Impl): Vector3Impl {
		const r = applyMatrix3(this._m, [v.X, v.Y, v.Z]);
		return new Vector3Impl(this._x + r[0], this._y + r[1], this._z + r[2]);
	}

	/** Apply the inverse of this CFrame to a world point → local space. */
	PointToObjectSpace(v: Vector3Impl): Vector3Impl {
		const dx = v.X - this._x;
		const dy = v.Y - this._y;
		const dz = v.Z - this._z;
		const m = this._m;
		// Inverse rotation = transpose (orthogonal matrix)
		return new Vector3Impl(
			m[0] * dx + m[3] * dy + m[6] * dz,
			m[1] * dx + m[4] * dy + m[7] * dz,
			m[2] * dx + m[5] * dy + m[8] * dz,
		);
	}
}

(global as any).CFrame = CFrameImpl;

// ---------------------------------------------------------------------------
// Roblox utility globals
// ---------------------------------------------------------------------------
(global as any).print = (...args: unknown[]) => {
	console.log("[Roblox print]", ...args);
};

(global as any).warn = (...args: unknown[]) => {
	console.warn("[Roblox warn]", ...args);
};

(global as any).tostring = (x: unknown) => String(x);

(global as any).pairs = (obj: Record<string, unknown>) => Object.entries(obj);

(global as any).os = {
	time: () => Math.floor(Date.now() / 1000),
	clock: () => Date.now() / 1000,
};

(global as any).game = {
	Workspace: {},
	GetService: (_name: string) => ({}),
	BindToClose: (_fn: () => void) => {},
};

(global as any).Random = class RandomImpl {
	NextNumber(min = 0, max = 1) {
		return min + Math.random() * (max - min);
	}
};
