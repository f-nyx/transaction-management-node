import { v4 as uuid } from 'uuid'

export class Task {
  static create(name: string, data: string): Task {
    return new Task(uuid(), name, 'pending', data, false, new Date(), new Date())
  }

  static restore(task: any): Task {
    return new Task(
      task.id,
      task.name,
      task.state,
      task.data,
      task.is_locked,
      task.created_at ? new Date(task.created_at) : new Date(),
      task.updated_at ? new Date(task.updated_at) : new Date(),
    )
  }

  private constructor(
    readonly id: string,
    readonly name: string,
    readonly state: string,
    readonly data: string,
    readonly locked: boolean,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  start(): Task {
    return new Task(this.id, this.name, 'in-progress', this.data, this.locked, this.createdAt, new Date())
  }

  complete(): Task {
    return new Task(this.id, this.name, 'completed', this.data, this.locked, this.createdAt, new Date())
  }
}
