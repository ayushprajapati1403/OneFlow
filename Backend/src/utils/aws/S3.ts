import AWS from 'aws-sdk'
import { logger } from '../logger'

class S3 {
  /**
   * @description Upload file to S3 Bucket
   * @param {String} bucketName // S3 Bucket Name
   * @param {String} objName  // File Name or key name for file
   * @param {Buffer} buffer // Buffer file
   * @param {String} ACL // Object permission for bucket
   */
  async uploadToBucket(bucketName: string, objName: string, buffer: Buffer, ACL: string | undefined = undefined) {
    try {
      // Create new s3 object
      const s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
        region: process.env.S3_REGION
      })

      return await s3
        .putObject({
          Bucket: bucketName, // Bucket Name
          Key: objName, // Bucket Key
          Body: buffer, // File Buffer
          ACL // Public read permission
        })
        .promise()
    } catch (error) {
      logger.error(__filename, '', '', `Unable to connect to the server`, error)
      throw error
    }
  }

  /**
   * @description remove object from S3 Bucket
   * @param {String} bucketName // S3 Bucket Name
   * @param {String} objName  // File Name or key name for file
   */
  async removeObject(bucketName: string, objName: string) {
    try {
      // Create new s3 object
      const s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
        region: process.env.S3_REGION
      })

      return await s3
        .deleteObject({
          Bucket: bucketName, // Bucket Name
          Key: objName // Bucket Key
        })
        .promise()
    } catch (error) {
      logger.error(__filename, '', '', `Unable to connect to the server`, error)
      throw error
    }
  }

  /**
   * @description Generate signed url
   * @param bucketName // S3 Bucket Name
   * @param objName // File Name or key name for file
   * @param time // default: 900 — the number of seconds to expire the pre-signed URL operation in. Defaults to 15 minutes.
   */
  async generateSignedUrl(bucketName: string, objName: string, time: number | undefined = undefined) {
    try {
      // Create new s3 object
      const s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
        region: process.env.S3_REGION
      })

      return s3.getSignedUrl('getObject', {
        Bucket: bucketName, // Bucket Name
        Key: objName, // Bucket Key
        Expires: time
      })
    } catch (error) {
      logger.error(__filename, '', '', `Unable to connect to the server`, error)
      throw error
    }
  }
}

const s3Obj = new S3()
export default s3Obj
