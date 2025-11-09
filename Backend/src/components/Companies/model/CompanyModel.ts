import CompanySchema from '../schema/CompanySchema'

class CompanyModel {
  createCompany(name: string): Promise<CompanySchema> {
    return CompanySchema.create({ name })
  }

  findById(id: number): Promise<CompanySchema | null> {
    return CompanySchema.findByPk(id)
  }
}

export default new CompanyModel()
