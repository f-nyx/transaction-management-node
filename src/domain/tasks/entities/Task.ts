import { v4 as uuid } from 'uuid'

export class Task {
  static create(name: string): Task {
    return new Task(uuid(), name, 'pending', new Date(), new Date())
  }

  static restore(task: any): Task {
    return new Task(
      task.id,
      task.name,
      task.state,
      task.created_at ? new Date(task.created_at) : new Date(),
      task.updated_at ? new Date(task.updated_at) : new Date(),
    )
  }

  private constructor(
    readonly id: string,
    readonly name: string,
    readonly state: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  start(): Task {
    return new Task(this.id, this.name, 'in-progress', this.createdAt, new Date())
  }

  complete(): Task {
    return new Task(this.id, this.name, 'completed', this.createdAt, new Date())
  }
}
