import os
import shutil

# Restore pom.xml
pom_path = r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\pom.xml"
with open(pom_path, "w", encoding="utf-8") as f:
    f.write("""<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>test-project</artifactId>
    <version>1.0-SNAPSHOT</version>
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
    </properties>
    <dependencies>
        <!-- Simple dependencies -->
    </dependencies>

    <build>
        <plugins>
        </plugins>
    </build>
</project>
""")

# Delete generated dirs/files
src_dir = r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\src"
target_dir = r"c:\Users\ST-Sahana\Documents\prj-final\javaApex-Trainee\test_project\target"

if os.path.exists(src_dir):
    shutil.rmtree(src_dir, ignore_errors=True)
if os.path.exists(target_dir):
    shutil.rmtree(target_dir, ignore_errors=True)

print("Cleanup completed successfully!")
