import CountService from '../database/services/count_service'
import * as numbers from '../messages/numbers'

class Count {
  count = 0

  init(): void {
    CountService.get('numberCount')
      .then((num) => {
        this.count = num
      })
      .then(async () => {
        if (this.count < numbers.max) await numbers.unlock()
      })
      .catch(() => {
        throw new Error('Unable to get current count from database.')
      })
  }

  get(): number {
    return this.count
  }

  inc(): void {
    this.count++
  }
}

export default new Count()
