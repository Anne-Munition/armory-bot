import CountService from '../database/services/count_service'

class Count {
  count = 0

  init(): void {
    CountService.get('numberCount')
      .then((num) => {
        this.count = num
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
