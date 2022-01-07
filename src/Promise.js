// 定义Promise的状态
const PROMISE_STATUS_PENDING = "pending"
const PROMISE_STATUS_FULFILLED = "fulfilled"
const PROMISE_STATUS_REJECTED = "rejected"

// 封装一个工具函数,用来解决抛出异常问题
function execFunctionWithCatchError(executorFn, value, resolve, reject) {
	try {
		const result = executorFn(value)
		resolve(result)
	} catch (error) {
		reject(error)
	}
}

// 定义Promise类
class WestPromise {
	constructor(executor) {
		// 定义Promise的初始化状态
		this.status = PROMISE_STATUS_PENDING
		// 定义resovle/reject的参数默认值
		this.value = undefined
		this.reason = undefined
		// 定义存放成功或失败的回调
		this.onFulfilledCallbacks = []
		this.onRejectedCallbacks = []

		const resolve = value => {
			// 进入微任务
			queueMicrotask(() => {
				if (this.status === PROMISE_STATUS_PENDING) {
					this.status = PROMISE_STATUS_FULFILLED
					this.value = value
					this.onFulfilledCallbacks.forEach(fn => fn(this.value))
				}
			})
		}

		const reject = reason => {
			// 进入微任务
			queueMicrotask(() => {
				if (this.status === PROMISE_STATUS_PENDING) {
					this.status = PROMISE_STATUS_REJECTED
					this.reason = reason
					this.onRejectedCallbacks.forEach(fn => fn(this.reason))
				}
			})
		}

		// 处理异常问题
		try {
			executor(resolve, reject)
		} catch (error) {
			reject(error)
		}
	}

	then(
		onFulfilled,
		// 给onRejected一个默认值,解决使用catch时then方法没有onRejected函数的问题
		onRejected = err => {
			throw err
		}
	) {
		return new WestPromise((resolve, reject) => {
			// 判断Promise的状态是否发生了改变(处理异步任务,没有将回调添加到数组中的问题)
			if (this.status === PROMISE_STATUS_FULFILLED && onFulfilled) {
				execFunctionWithCatchError(onFulfilled, this.value, resolve, reject)
			}
			if (this.status === PROMISE_STATUS_REJECTED && onRejected) {
				execFunctionWithCatchError(onRejected, this.reason, resolve, reject)
			}

			// 判断onFulfilled/onRejected是否有值,没有值则不添加到成功/失败的回调
			if (onFulfilled) {
				this.onFulfilledCallbacks.push(value => {
					execFunctionWithCatchError(onFulfilled, value, resolve, reject)
				})
			}
			if (onRejected) {
				this.onRejectedCallbacks.push(reason => {
					execFunctionWithCatchError(onRejected, reason, resolve, reject)
				})
			}
		})
	}

	catch(onRejected) {
		return this.then(
			// 给onFulfilled一个默认值,解决finally方法在catch之后调用时,没有onFulfilled函数的问题
			res => res,
			onRejected
		)
	}

	finally(onFinally) {
		/* 
			//* 此处是下面this.then()函数的详细写法,需要一定的Promise功底才能看明白,看不明白的也不用纠结,把注释的这一段看明白就好了
			this.then(
			res => {
				console.log("成功的Finally")
				onFinally(res)
			},
			err => {
				console.log("失败的Finally")
				onFinally(err)
			}
		)
		*/
		this.then(onFinally, onFinally)
	}

	static resolve(value) {
		return new WestPromise(resolve => resolve(value))
	}

	static reject(reason) {
		return new WestPromise((resolve, reject) => reject(reason))
	}

	static all(promiseArray) {
		return new WestPromise((resolve, reject) => {
			const result = []
			promiseArray.forEach(promise => {
				promise.then(res => {
					result.push(res)
					if (result.length === promiseArray.length) resolve(result)
				}, reject)
			})
		})
	}

	static allSettled(promiseArray) {
		return new WestPromise(resolve => {
			const result = []
			promiseArray.forEach(promise => {
				promise.then(
					res => {
						result.push({ status: PROMISE_STATUS_FULFILLED, value: res })
						if (result.length === promiseArray.length) resolve(result)
					},
					err => {
						result.push({ status: PROMISE_STATUS_REJECTED, value: err })
						if (result.length === promiseArray.length) resolve(result)
					}
				)
			})
		})
	}

	static race(promiseArray) {
		return new WestPromise((resolve, reject) => {
			promiseArray.forEach(promise => {
				promise.then(resolve, reject)
			})
		})
	}

	static any(promiseArray) {
		return new WestPromise((resolve, reject) => {
			const reason = []
			promiseArray.forEach(promise => {
				promise.then(resolve, err => {
					reason.push(err)
					if (reason.length === promiseArray.length) {
						reject(new AggregateError(reason))
					}
				})
			})
		})
	}
}

// 测试代码
const p1 = new WestPromise((resolve, reject) => {
	setTimeout(() => {
		reject(111)
	}, 1000)
})

const p2 = new WestPromise((resolve, reject) => {
	setTimeout(() => {
		reject(222)
	}, 2000)
})

const p3 = new WestPromise((resolve, reject) => {
	setTimeout(() => {
		reject(333)
	}, 3000)
})

WestPromise.any([p1, p2, p3])
	.then(res => {
		console.log(res)
	})
	.catch(err => {
		console.log("err: ", err.errors)
	})
